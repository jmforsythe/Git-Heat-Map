SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) AS "Total changes",
       commits.authorEmail AS "Committer email"
FROM commitFile
JOIN commits ON commits.hash = commitFile.hash
GROUP BY commits.authorEmail
ORDER BY Rank ASC
