import sys
import json
from smb.SMBConnection import SMBConnection
from smb.base import SharedFile as SFile
import smb

def exit():
	sys.stdout.flush()
	conn.close()
	sys.exit(0)

try:
	target = sys.argv[1]
	share = sys.argv[2]
	path = sys.argv[3]
except IndexError:
	print 'usage: listpath.py target share path'
	sys.exit(1)

conn = SMBConnection('guest', '', 'Athena', target, '', True, 1, True)
try:
	conn.connect(target, 445)
	listing = conn.listPath(share, path)
except Exception as err:
	# target refused connection
	print err
	exit()


# filter . and .. directories
listing = [file for file in listing if file.filename not in ['.','..']]

# build dicts from files
listing = [{
	'filename': file.filename,
	'directory': file.isDirectory,
	'size': file.file_size
	} for file in listing]

print json.dumps(listing)
exit()