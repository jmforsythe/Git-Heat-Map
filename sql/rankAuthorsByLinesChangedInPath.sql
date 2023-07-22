SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded+commitFile.linesRemoved) DESC) AS "Rank", 
       SUM(commitFile.linesAdded+commitFile.linesRemoved) AS "Total changes",
       commitAuthor.authorEmail AS "Author email"
FROM commitAuthor
JOIN commitFile ON commitAuthor.hash = commitFile.hash
JOIN files ON commitFile.fileID = files.fileID
WHERE files.filePath LIKE ?
GROUP BY commitAuthor.authorEmail
ORDER BY Rank ASC
