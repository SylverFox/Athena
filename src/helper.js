exports.bytesToSize = function(bytes) {
	if (bytes == 0) return '0 Bytes'
	
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
   	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
   	const value = +(bytes / Math.pow(1024, i)).toFixed(2)
	return value + ' ' + sizes[i]
}

exports.intervalToTime = function(timestamp) {
	if(timestamp > 3600000) {
		return (timestamp / 3600000).toFixed(2)+'h'
	} else if(timestamp > 60000) {
		return (timestamp / 60000).toFixed(2)+'m'
	} else if(timestamp > 1000) {
		return (timestamp / 1000).toFixed(2)+'s'
	} else {
		return timestamp + 'ms'
	}
}

exports.timestampToLastseen = function(timestamp) {
	const int = new Date() - new Date(timestamp)
	return this.intervalToTime(int)+' ago'
}