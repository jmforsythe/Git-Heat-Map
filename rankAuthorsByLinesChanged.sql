SELECT RANK() OVER (ORDER BY SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) DESC) AS "Rank", 
       SUM(commitFile.linesAdded)+SUM(commitFile.linesRemoved) AS "Total changes",
       author.authorEmail AS "Author email"
FROM author
JOIN commitAuthor ON author.authorEmail = commitAuthor.authorEmail
JOIN commitFile ON commitAuthor.hash = commitFile.hash
GROUP BY author.authorEmail
ORDER BY Rank ASC
