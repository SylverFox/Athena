import sys
import json
from smb.SMBConnection import SMBConnection
from smb.base import SharedDevice

def listTarget(target):
	conn = SMBConnection('guest@'+target, '', 'Athena', target, '', True, 2, True)
	try:
		conn.connect(target, 445)
		shares = conn.listShares()
	except:
		return []
	# filter on disks and not special shares only
	shares = [share for share in shares if share.type == SharedDevice.DISK_TREE and not share.isSpecial]
	sharenames = [share.name.encode('ascii') for share in shares]
	# filter out remaining special or administrative shares
	sharenames = [name for name in sharenames if not name.endswith('$')]
	conn.close()
	return sharenames

for line in sys.stdin:
	target = line[:-1]
	result = {"hostname": target, "shares": listTarget(target)}
	print json.dumps(result)