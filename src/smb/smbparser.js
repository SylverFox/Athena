const SMB = require('smb2c')

const ATTR_READONLY 			= 0x00000001
const ATTR_HIDDEN 				= 0x00000002
const ATTR_SYSTEM 				= 0x00000004
const ATTR_DIRECTORY 			= 0x00000010
const ATTR_ARCHIVE 				= 0x00000020
const ATTR_NORMAL 				= 0x00000080
const ATTR_TEMPORARY 			= 0x00000100
const ATTR_SPARSE 				= 0x00000200
const ATTR_REPARSE_POINT		= 0x00000400
const ATTR_COMPRESSED 			= 0x00000800
const ATTR_OFFLINE 				= 0x00001000
const ATTR_NOT_CONTENT_INDEXED 	= 0x00002000
const ATTR_ENCRYPTED 			= 0x00004000

function constructClient(ip, share) {
	return new SMB({
		share: '\\\\'+ip+'\\'+share,
		domain: 'WORKGROUP',
		username: 'guest',
		password: ''
	})
}

function Session(ip, share) {
	this.client = constructClient(ip, share)
	this.listPath = (path) => module.exports.listPath(this.client, path)
	this.close = () => this.client.close()
}

module.exports = Session

module.exports.session = function(ip, share) {
	return new Session(ip, share)
}

module.exports.listPath = function(session, path) {
	return new Promise((resolve , reject) => {
		let tempsession = false

		if(!(session instanceof SMB)) {
			if(session.ip && session.share) {
				session = constructClient(session.ip, session.share)
				tempsession = true
			}
			else {
				reject(new Error('invalid session or no ip and share'))
				return
			}
		}

		session.readdir(path, (err, files) => {
			if(tempsession)
				session.close()

			if(err)
				reject(err)
			else {
				output = []
				for(let file of files) {
					output.push({
						filename: file.fileName,
						size: file.fileSize,
						directory: isDirectory(file)
					})
				}
				resolve(output)
			}
		})
	})
}

module.exports.commonerrors = ['STATUS_ACCESS_DENIED','STATUS_LOGON_FAILURE','STATUS_BAD_NETWORK_NAME', 'ETIMEDOUT']

// TODO list shares of host

function isDirectory(file) {
	return (file.fileAttributes & ATTR_DIRECTORY) === ATTR_DIRECTORY
}