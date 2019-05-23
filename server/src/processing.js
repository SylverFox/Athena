const Database = require('better-sqlite3')
const config = require('config')
const {info, debug} = require('winston')

const db = new Database(process.cwd() + '/db/athena.db')

// db.exec('DROP TABLE IF EXISTS hosts; DROP TABLE IF EXISTS shares; DROP TABLE IF EXISTS files')

db.exec(`CREATE TABLE IF NOT EXISTS hosts (
	id INTEGER PRIMARY KEY,
	ip TEXT NOT NULL UNIQUE,
	hostname TEXT NOT NULL UNIQUE,
	lastseen DATETIME DEFAULT CURRENT_TIMESTAMP
)`)

db.exec(`CREATE TABLE IF NOT EXISTS shares (
	id INTEGER PRIMARY KEY,
	host_id INTEGER,
	sharename TEXT,
	filecount INTEGER DEFAULT 0,
	size INTEGER DEFAULT 0,
	FOREIGN KEY (host_id) REFERENCES hosts(id),
	CONSTRAINT unq UNIQUE (host_id, sharename)
)`)

db.exec(`CREATE TABLE IF NOT EXISTS files (
	id INTEGER PRIMARY KEY,
	share_id INTEGER,
	filename TEXT,
	path TEXT,
	size INTEGER,
	is_directory INTEGER,
	FOREIGN KEY (share_id) REFERENCES shares(id)
)`)

db.exec(`CREATE TABLE IF NOT EXISTS scans (
	id INTEGER PRIMARY KEY,
	task TEXT,
	starttime DATETIME,
	runtime INTEGER
)`)

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

