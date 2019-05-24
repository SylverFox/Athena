const db = require('./models')
const config = require('config')
const {info, error, debug} = require('winston')

exports.findHostById = id => db.prepare('SELECT * FROM hosts WHERE id = ?').get(id)
exports.findHosts = () => db.prepare('SELECT * FROM hosts').all()
exports.upsertHost = host => db.prepare(`REPLACE INTO hosts (ip, hostname, lastseen)
	VALUES (:ip, :hostname, DATETIME('now'))`).run(host)
exports.updateLastseen = id =>
	db.prepare('UPDATE hosts SET lastseen = DATETIME(\'now\') WHERE id = ?').run(id)

exports.findShareById = id => db.prepare('SELECT * FROM shares WHERE id = ?').get(id)
exports.findShareByName = name => db.prepare('SELECT * FROM shares WHERE sharename = ?').get(name)
exports.upsertShare = (host_id, share) => db.prepare(`INSERT OR REPLACE INTO shares
	(host_id, sharename, filecount, size) VALUES (?, ?, ?, ?)`)
	.run(host_id, share.name, share.filecount, share.size)

exports.removeFiles = share_id => db.prepare('DELETE FROM files WHERE share_id = ?').run(share_id)
exports.insertFiles = (shareId, files) => {
	const insert = db.prepare(`INSERT INTO files (share_id, filename, path, size, is_directory)
		VALUES (?, ?, ?, ?, ?)`)
	
	const insertBulk = db.transaction((sid, fls) => {
		for(let f of fls) {
			insert.run(sid, f.filename, f.path, f.size, f.isDirectory ? 1 : 0)
		}
	})

	insertBulk(shareId, files)
}

exports.insertScan = (task, start, runtime) =>
	db.prepare('INSERT INTO scans (task, starttime, runtime) VALUES (?, ?, ?)')
		.run(task, Number(start), runtime)

