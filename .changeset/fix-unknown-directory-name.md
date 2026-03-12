---
"@toju.network/sol": minor
"@toju.network/fil": minor
---

add optional directoryName field to CreateDepositArgs for preserving directory names during multi-file uploads. previously, directory uploads saved fileName as null in the database, causing "Unknown File" to display in upload history. the UI now extracts the directory name from webkitRelativePath and passes it through the SDK to the server.
