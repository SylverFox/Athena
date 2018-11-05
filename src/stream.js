const SMB = require('smb2c')
const {debug, error} = require('winston')

const processing = require('./processing')

//const MAX_CHUNK = 10 * 1024 * 1024 // 10 MB
const MAX_CHUNK = 1024 * 1024

module.exports = function(request, response) {
	const key = request.query.key
	const range = request.headers.range
	if(!range)
		return response.sendStatus(416) // Range Not Satisfiable

	// get video info
	processing.getStreamableInfo(key)
		.then(doc => {
			if(!doc.length) {
				return response.sendStatus(404) // not found
			}

			const location = doc[0].location.split('/')
			const sharename = location.slice(0,4).join('\\')
			const video = location.slice(4).join('\\')

			const size = doc[0].size - 1 // skip eof
			const type = doc[0].type

			// range info
			const rangepos = range ? range.replace(/bytes=/, '').split('-') : [0]
			let start = parseInt(rangepos[0], 10)
			let end = rangepos[1] ? parseInt(rangepos[1], 10) : Infinity
			let chunksize = end-start

			if(chunksize > MAX_CHUNK) {
				end = start + MAX_CHUNK > size ? size : start + MAX_CHUNK
				chunksize = (end - start) + 1
			}

			const client = new SMB({share: sharename, domain: '', username: 'guest', password: ''})
			client.createReadStream(video, {start: start, end: end}, (err, stream) => {
				if(err) {
					return response.sendStatus(423) // Locked
				}

				// write response headers
				response.writeHead(206, {
					'Content-Range': 'bytes ' + start + '-' + end + '/' + (size + 1),
					'Accept-Ranges': 'bytes',
					'Content-Length': chunksize,
					'Content-Type': type
				})

				// start piping
				stream.pipe(response)
			})
		})
		.catch(err => {
			error(err)
			return response.sendStatus(500)
		})
}