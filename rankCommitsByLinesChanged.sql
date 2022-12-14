SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) AS "Total changes",
       commits.hash AS "Commit hash"
FROM commits
JOIN commitFile ON commits.hash = commitFile.hash
GROUP BY commits.hash
ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesAdded) DESC
