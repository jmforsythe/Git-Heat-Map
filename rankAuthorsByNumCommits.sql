SELECT RANK() OVER (ORDER BY COUNT(*) DESC) AS "Rank",
       COUNT(*) AS "Number of commits",
       commits.authorEmail AS "Author email"
FROM commits
GROUP BY commits.authorEmail
ORDER BY Rank ASC
