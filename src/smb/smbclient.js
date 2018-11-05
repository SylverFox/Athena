const SMB = require('smb2c')

const ATTR_DIRECTORY = 0x0010

module.exports = class SmbClient {
	constructor(ip, share) {
		if(!ip || !share) {
			throw new Error('no ip or share given')
		}
		this.client = new SMB({
			share: '\\\\'+ip+'\\'+share,
			domain: 'WORKGROUP',
			username: 'guest',
			password: ''
		})
	}

	// returns a path listing
	readdir(path) {
		return new Promise((resolve, reject) => {
			this.client.readdir(path, (err, files) => {
				if(err) reject(err)
				else {
					const output = files.map(f => ({
						filename: f.fileName,
						size: f.fileSize,
						isDirectory: (f.fileAttributes & ATTR_DIRECTORY) !== 0
					}))
					resolve(output)
				}
			})
		})
	}

	// closes the connection
	close() {
		this.client.close()
	}
}