const SMB = require('smb2c')
const {log} = require('winston')

const ATTR_READONLY 			= 0x0001
const ATTR_HIDDEN 				= 0x0002
const ATTR_SYSTEM 				= 0x0004
const ATTR_DIRECTORY 			= 0x0010
const ATTR_ARCHIVE 				= 0x0020
const ATTR_NORMAL 				= 0x0080
const ATTR_TEMPORARY 			= 0x0100
const ATTR_SPARSE 				= 0x0200
const ATTR_REPARSE_POINT		= 0x0400
const ATTR_COMPRESSED 			= 0x0800
const ATTR_OFFLINE 				= 0x1000
const ATTR_NOT_CONTENT_INDEXED 	= 0x2000
const ATTR_ENCRYPTED 			= 0x4000

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
	this.exists = (path) => module.exports.exists(this.client, path)
	this.close = this.client.close
}

module.exports = Session

module.exports.session = function(ip, share) {
	return new Session(ip, share)
}

module.exports.exists = function(session, path) {
	return new Promise((resolve, reject) => {
		session.exists(path, (err, exists) => {
			if(err)
				reject(err)
			else 
				resolve(exists)
		})
	})
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
				log('warn', 'invalid session or no ip and share')
				reject(new Error('cannot create session without ip or share'))
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