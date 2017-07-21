import sys
import json
from smb.SMBConnection import SMBConnection
from smb.base import SharedDevice

try:
	target = sys.argv[1]
except IndexError:
	print 'no target given'
	sys.exit(1)

conn = SMBConnection('guest@'+target, '', 'Athena', target, '', True, 2, True)
try:
	conn.connect(target, 445)
except:
	# target refused connection
	print 'target refused connection'
	conn.close()
	sys.exit(1)

shares = conn.listShares()

# filter on disks and not special shares only
shares = [share for share in shares if share.type == SharedDevice.DISK_TREE and not share.isSpecial]

sharenames = [share.name.encode('ascii') for share in shares]

# filter out remaining special or administrative shares
sharenames = [name for name in sharenames if not name.endswith('$')]

print json.dumps(sharenames)

sys.stdout.flush()
conn.close()
sys.exit(0)