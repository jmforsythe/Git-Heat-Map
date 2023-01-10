SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) AS "Total changes",
       commits.hash AS "Commit hash"
FROM commits
JOIN commitFile ON commits.hash = commitFile.hash
GROUP BY commits.hash
ORDER BY Rank ASC
