const {spawn} = require("child_process");

exports.indexHost = function(target) {
	return new Promise((resolve, reject) => {
		if(!target.shares || target.shares.length == 0) {
			reject('no shares for target');
		}

		console.log('indexing '+target.hostname)

		let totalTree = []

		target.shares.forEach((share, index) => {
			let proc = spawn('python',['src/python/sharetree.py',target.hostname,share]);
			proc.stderr.pipe(proc.stdout);

			let output = '';
			proc.stdout.on('data', data => {
				output += data.toString()
			});

			proc.on('exit', code => {
				if(code > 0) console.log('something went wrong, most likely the share was not accessible');
				else {
					const parsedOutput = JSON.parse(output)

					//console.log(parsedOutput);
					if(parsedOutput.length)
						totalSize = parsedOutput.map(x => x.size).reduce((sum, val) => sum+val)
					else
						totalSize = 0
					console.log(`indexed share "${share}" on host "${target.hostname}", total size : ${totalSize} bytes`)

					let thisShare = {
						directory: true,
						size: totalSize,
						filename: share,
						children: parsedOutput
					}
					totalTree.push(thisShare)
					if(index === target.shares.length - 1)
						resolve(totalTree)
				}
			})
		})

	})
}