import sys
import json
from smb.SMBConnection import SMBConnection
from smb.base import SharedFile as SFile

def listTarget(target, share, path):
	conn = SMBConnection('guest@'+target, '', 'Athena', target, '', True, 2, True)
	try:
		conn.connect(target, 445)
		listing = conn.listPath(share, path)
		
	except:
		#return ['error: '+target+';'+share+';'+path]
		return []
	
	# filter . and .. directories
	listing = [file for file in listing if file.filename not in ['.','..']]
	# build dicts from files
	listing = [{
		'filename': file.filename,
		'directory': file.isDirectory,
		'size': file.file_size
	} for file in listing]

	return listing

for line in sys.stdin:
	split = line[:-1].split()
	
	listing = listTarget(split[1], split[2][1:-1], split[3][1:-1])
	print json.dumps({"id": split[0], "data": listing})