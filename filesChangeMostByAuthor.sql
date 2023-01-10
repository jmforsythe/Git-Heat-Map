SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) AS "Total changes",
       files.filePath AS "File path",
       commits.authorEmail
FROM commitFile
JOIN files ON files.fileID = commitFile.fileID
JOIN commits ON commits.hash = commitFile.hash
WHERE files.filePath NOTNULL AND commits.authorEmail LIKE "%"
GROUP BY files.filePath
ORDER BY Rank ASC
