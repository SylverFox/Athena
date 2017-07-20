import sys
import json
from smb.SMBConnection import SMBConnection
from smb.base import SharedFile as SFile
import smb

try:
	target = sys.argv[1]
	share = sys.argv[2]
except IndexError:
	print 'usage: sharetree.py target share'
	sys.exit(1)

conn = SMBConnection('guest@'+target, '', 'crawlertest', target)
try:
	conn.connect(target, 139)
except:
	# target refused connection
	print 'target refused connection'
	conn.close()
	sys.exit(1)


# recursively travel the share and populate tree
def listDirContents(path):
	try:
		listing = conn.listPath(share, path)
	except smb.smb_structs.OperationFailure:
		#failure on this branch, return empty set
		return [],0
	except smb.base.SMBTimeout:
		#timeout, return empty set for now
		#TODO, maybe retry?
		return [],0

	tree = []
	total_size = 0

	for file in listing:
		if file.filename in ['.','..']:
			continue

		item = {
			'filename': file.filename,
			'directory': file.isDirectory,
		}
		if not file.isDirectory:
			item['size'] = file.file_size
		else:
			subtree, size = listDirContents(path + file.filename + '/')
			item['size'] = size
			item['children'] = subtree

		tree.append(item)
		total_size += item['size']
	return tree, total_size

tree, size = listDirContents('/')

print json.dumps(tree)

sys.stdout.flush()

conn.close()
sys.exit(0)