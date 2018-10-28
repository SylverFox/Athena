import sys
import json
from smb.SMBConnection import SMBConnection
from smb.base import SharedDevice

def listTarget(target):
	conn = SMBConnection('guest@'+target, '', 'Athena', target, '', True, 2, True)
	shares = []
	try:
		conn.connect(target, 445)
		shares = conn.listShares()
	except:
		return []
	finally:
		conn.close()

	# filter on disks and not special shares only
	shares = [share for share in shares if share.type == SharedDevice.DISK_TREE and not share.isSpecial]
	shares = [share.name.encode('ascii') for share in shares]
	# filter out remaining special or administrative shares
	shares = [name for name in shares if not name.endswith('$')]
	return shares

for line in sys.stdin:
	target = line[:-1]
	print json.dumps({"ip": target, "shares": listTarget(target)})