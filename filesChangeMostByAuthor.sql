SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) AS "Total changes",
       files.filePath AS "File path",
       commits.authorEmail
FROM commitFile
JOIN files ON files.fileID = commitFile.fileID
JOIN commits ON commits.hash = commitFile.hash
WHERE commits.authorEmail LIKE "%"
GROUP BY files.filePath
ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) DESC
