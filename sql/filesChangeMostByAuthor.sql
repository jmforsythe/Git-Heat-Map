SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) AS "Total changes",
       files.filePath AS "File path"
FROM commitFile
JOIN files ON files.fileID = commitFile.fileID
JOIN commitAuthor ON commitFile.hash = commitAuthor.hash
WHERE files.filePath NOTNULL AND commitAuthor.authorEmail LIKE ?
GROUP BY files.filePath
ORDER BY Rank ASC
