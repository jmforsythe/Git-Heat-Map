SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) AS "Total changes",
       files.filePath AS "File path"
FROM commitFile
JOIN files ON files.fileID = commitFile.fileID
WHERE files.filePath NOTNULL
GROUP BY files.fileID
ORDER BY Rank ASC
