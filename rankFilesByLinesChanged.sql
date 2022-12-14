SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) AS "Total changes",
       files.filePath AS "File path"
FROM commitFile
JOIN files ON files.fileID = commitFile.fileID
GROUP BY files.filePath
ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) DESC
