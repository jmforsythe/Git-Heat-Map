SELECT RANK() OVER (ORDER BY COUNT(*) DESC) AS "Rank",
       COUNT(*) AS "Number of commits",
       authorEmail AS "Author email"
FROM commitAuthor
GROUP BY authorEmail
ORDER BY Rank ASC
