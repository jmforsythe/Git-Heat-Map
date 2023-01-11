SELECT RANK() OVER (ORDER BY COUNT(*) DESC) AS "Rank", COUNT(*), files.filePath AS "File path"
FROM commitFile
JOIN files ON files.fileID = commitFile.fileID
WHERE files.filePath NOTNULL
GROUP BY files.filePath
ORDER BY Rank ASC
