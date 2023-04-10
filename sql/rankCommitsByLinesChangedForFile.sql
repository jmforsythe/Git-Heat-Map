SELECT RANK() OVER (ORDER BY commitFile.linesAdded+commitFile.linesRemoved DESC) AS "Rank", 
       commitFile.linesAdded+commitFile.linesRemoved AS "Total changes",
       commits.hash AS "Commit hash"
FROM commits
JOIN commitFile ON commits.hash = commitFile.hash
JOIN files ON commitFile.fileID = files.fileID
WHERE files.filePath = ?
GROUP BY commits.hash
ORDER BY Rank ASC
