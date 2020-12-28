#Simple script to simplify committing.
import os
import sys
if len(sys.argv) < 2:
	print("Invalid usage; Takes one argument: commit message")
else:
	os.system('git add .')
	os.system(f'git commit -m "{sys.argv[1]}"')
	os.system('git push')
