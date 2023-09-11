--BASIC QUERIES
SELECT * FROM users WHERE email=:email AND password=:password;--user login
SELECT * FROM Admins WHERE email=:email AND password=:password;--admin login
#SELECT SUM(PRICE) FROM ORDERS GROUP BY SELLERID HAVING SELLERID =:UserID;--profile
#SELECT COUNT(BOOKID) FROM ORDERS GROUP BY SELLERID HAVING SELLERID =:UserID;--profile
#SELECT COUNT(BOOKID) FROM SELLS GROUP BY SELLERID HAVING SELLERID=:UserID;--profile
#SELECT COUNT(BOOKID) FROM ORDERS GROUP BY BUYERID HAVING BUYERID=:UserID;--profile
#SELECT * FROM Report;--Admin/Report
#SELECT locationID FROM USERS WHERE userID=:BuyerID;--order place
#SELECT * FROM Users WHERE userID = :accusedID;--Report
#SELECT * FROM Report WHERE accusedID = :accusedID AND reporterID = :reporterID;--Report
#SELECT DISTINCT CASE                      --message sender and receiver
	WHEN senderID = :userID 
	THEN receiverID 
	ELSE senderID END AS interactionID 
   	FROM Messages WHERE senderID = :userID OR receiverID = :userID;
#SELECT userID, userName --message sender and receiver
   FROM Users 
   WHERE userID IN (:user1ID, :user2ID);
#SELECT * FROM Messages              --messages
   WHERE (senderID = :user1ID AND receiverID = :user2ID) 
   OR (senderID = :user2ID AND receiverID = :user1ID) 
   ORDER BY messageTime ASC;

--Advanced Queries
--User INfo
#SELECT u.FIRSTNAME||' '||u.LASTNAME AS Name, u.EMAIL, l.DISTRICT, l.DIVISION     --profile details
  FROM USERS u LEFT JOIN LOCATIONS l ON u.LOCATIONID = l.LOCATIONID WHERE u.UserID=:UserID
--Search By Year
#SELECT b.TITLE AS book_title, a.AUTHORNAME AS author_name,
  p.PUBLISHERNAME AS publisher, b.PUBLICATIONYEAR AS publication_year,
  b.PRICE AS price, u.FIRSTNAME ||' '||u.LASTNAME AS seller_name,
  (s.DISCOUNT*100) AS discount,u.USERID as userID
  FROM BOOKS b JOIN AUTHORS a ON b.AUTHORID = a.AUTHORID
  JOIN PUBLISHERS p ON b.PUBLISHERID = p.PUBLISHERID
  JOIN SELLS s ON s.BOOKID = b.BOOKID
  JOIN USERS u ON s.SELLERID = u.USERID
  WHERE ${t}.${selectedOption} = :SearchName;
--Search By Names
#SELECT b.TITLE AS book_title, a.AUTHORNAME AS author_name,
  p.PUBLISHERNAME AS publisher, b.PUBLICATIONYEAR AS publication_year,
  b.PRICE AS price, u.FIRSTNAME ||' '||u.LASTNAME AS seller_name,
  (s.DISCOUNT*100) AS discount,u.USERID as userID
  FROM BOOKS b JOIN AUTHORS a ON b.AUTHORID = a.AUTHORID
  JOIN PUBLISHERS p ON b.PUBLISHERID = p.PUBLISHERID
  JOIN SELLS s ON s.BOOKID = b.BOOKID
  JOIN USERS u ON s.SELLERID = u.USERID
  WHERE ${t}.${selectedOption} LIKE '%'||:SearchName ||'%';
--Cart
#SELECT  C.BOOKID AS BOOK_ID,
  C.SELLERID AS SELLER_ID,(SELECT B.TITLE FROM BOOKS B WHERE B.BOOKID = C.BOOKID) AS BOOK_NAME,
  (SELECT A.AUTHORNAME FROM AUTHORS A WHERE A.AUTHORID = (SELECT B.AUTHORID FROM BOOKS B WHERE B.BOOKID = C.BOOKID)) AS AUTHOR_NAME,
  (SELECT P.PUBLISHERNAME FROM PUBLISHERS P WHERE P.PUBLISHERID = (SELECT B.PUBLISHERID FROM BOOKS B WHERE B.BOOKID = C.BOOKID)) AS PUBLISHER_NAME,
  (SELECT B.PRICE FROM BOOKS B WHERE B.BOOKID = C.BOOKID) AS PRICE,
  (SELECT S.DISCOUNT FROM SELLS S WHERE S.BOOKID = C.BOOKID AND S.SELLERID = C.SELLERID) AS DISCOUNT,
  (SELECT U.FIRSTNAME ||' '|| U.LASTNAME FROM USERS U WHERE U.USERID = C.SELLERID) AS SELLER_FULL_NAME
  FROM CART C WHERE BUYERID=:UserID;
--Selling books
#SELECT b.title AS book_title, a.authorName AS author_name,
  p.publisherName AS publisher, b.publicationYear AS publication_year,
  b.price AS price, (s.discount*100) AS discount, b.MEDIUMIMAGEURL
  FROM Sells s JOIN Books b ON s.bookID = b.bookID
  JOIN Authors a ON b.authorID = a.authorID
  JOIN Publishers p ON b.publisherID = p.publisherID
  WHERE s.sellerID = :UserId;
--Sold Books
#SELECT B.title AS book_title, A.authorName AS author_name,
  P.publisherName AS publisher, B.publicationYear AS publication_year,
  U_buyer.firstName || ' ' || U_buyer.lastName AS buyer_name,
  L.district || ', ' || L.division AS location_name, O.price, B.MEDIUMIMAGEURL as image
  FROM Orders O
  JOIN Books B ON O.bookID = B.bookID
  JOIN Authors A ON B.authorID = A.authorID
  JOIN Publishers P ON B.publisherID = P.publisherID
  JOIN Users U_buyer ON O.buyerID = U_buyer.userID
  LEFT JOIN Locations L ON O.locationID = L.locationID
  WHERE O.sellerID = :UserId;
--Orderd Books
#SELECT B.title AS book_title, A.authorName AS author_name,
  P.publisherName AS publisher, B.publicationYear AS publication_year
  U_seller.firstName || ' ' || U_seller.lastName AS seller_name,
  O.price, B.MEDIUMIMAGEURL as image
  FROM Orders O JOIN Users U_buyer ON O.buyerID = U_buyer.userID
  JOIN Users U_seller ON O.sellerID = U_seller.userID
  JOIN Books B ON O.bookID = B.bookID
  JOIN Authors A ON B.authorID = A.authorID
  JOIN Publishers P ON B.publisherID = P.publisherID
  WHERE O.buyerID = :UserId;
--Payment
#SELECT C.BOOKID, C.BUYERID, C.SELLERID,
  (SELECT B.TITLE FROM BOOKS B WHERE B.BOOKID = C.BOOKID) AS BOOK_NAME,
  (SELECT A.AUTHORNAME FROM AUTHORS A WHERE A.AUTHORID = 
  (SELECT B.AUTHORID FROM BOOKS B WHERE B.BOOKID = C.BOOKID)) AS AUTHOR_NAME,
  (SELECT P.PUBLISHERNAME FROM PUBLISHERS P WHERE P.PUBLISHERID = 
  (SELECT B.PUBLISHERID FROM BOOKS B WHERE B.BOOKID = C.BOOKID)) AS PUBLISHER_NAME,
  (SELECT B.PRICE FROM BOOKS B WHERE B.BOOKID = C.BOOKID) AS PRICE,
  (SELECT S.DISCOUNT FROM SELLS S WHERE S.BOOKID = C.BOOKID AND S.SELLERID = C.SELLERID) AS DISCOUNT,
  (SELECT U.FIRSTNAME ||' '|| U.LASTNAME FROM USERS U WHERE U.USERID = C.SELLERID) AS SELLER_FULL_NAME,
  (SELECT B.MEDIUMIMAGEURL FROM BOOKS B WHERE B.BOOKID = C.BOOKID) AS BOOK_IMG
  FROM CART C WHERE C.BUYERID=:UserID AND C.SELLERID= :SellerID AND C.BOOKID=:BookID;

--Insert
--User Sign up
#INSERT INTO users (userid, email, password) VALUES (:cnt, :email, :password);
--All four inserted in one click for add book
#INSERT INTO Authors (authorID, authorName) VALUES (:AuthorID, :Author);
#INSERT INTO Publishers (publisherID, publisherName) VALUES (:PublisherID, :Publisher);
#INSERT INTO Books (bookID, title, publicationYear, authorID, price, publisherID) VALUES (:BookID, :Title, :Year, :AuthorId, :Price, :PublisherId);
#INSERT INTO Sells (sellerID, bookID, discount) VALUES (:UserId,:BookId,:Discount);
#INSERT INTO Sells (sellerID, bookID, discount) VALUES (:UserId,:BookId,:Discount);
--Insert to cart
#INSERT INTO CART (BUYERID, BOOKID, SELLERID) VALUES (:buyerID, :bookID, :sellerID);
--Insert into Orders
#INSERT INTO Orders (orderID, sellerID, buyerID, bookID, locationID, price) VALUES (:OrderID,:SellerID ,:BuyerID,:BookID, :LocationID,:Price);
--Report
#INSERT INTO Report (adminID, accusedID, reporterID, cause) VALUES (:adminID, :accusedID, :reporterID, :cause);
--Message
#INSERT INTO messages (senderID, receiverID, messageText, messageTime, isRead) VALUES (:senderID, :receiverID, :messageText, SYSTIMESTAMP, :isRead);

--UPDATE 
--profile
#UPDATE USERS
 SET FIRSTNAME = :fName, LASTNAME =:lName 
 WHERE USERID=:UserID;
--profile
#UPDATE USERS
  SET EMAIL = :Email
  WHERE USERID=:UserID;
--profile
#UPDATE USERS
  SET LOCATIONID = (SELECT LOCATIONID FROM LOCATIONS WHERE DISTRICT=:District)
  WHERE USERID=:UserID;
--remove report
#UPDATE Users SET reported = 1 WHERE userID = :accusedID;


--DELETE 
--Cart
#DELETE FROM CART WHERE BUYERID = :buyerID AND BOOKID = :bookID AND SELLERID= :sellerID;
--Sells
#DELETE FROM Sells 
  WHERE sellerID = :UserId
  AND bookID IN (SELECT bookID FROM Books WHERE title= :Title);
--remove report
#DELETE FROM Report WHERE accusedID = :accusedID AND reporterID = :reporterID;

--Procedures
#CREATE OR REPLACE PROCEDURE MAXAUTHORID(
   maxAuthor OUT NUMBER
) IS
BEGIN
    SELECT MAX(authorID) INTO maxAuthor FROM Authors;
END;

#CREATE OR REPLACE PROCEDURE MAXBOOKID(
    maxBook OUT NUMBER
) IS
BEGIN
    SELECT MAX(bookID) INTO maxBook  FROM Books;
END ;

#CREATE OR REPLACE PROCEDURE MAXPUBLISHERID(
    maxPublisher OUT NUMBER
) IS
BEGIN
    SELECT MAX(publisherID) INTO maxPublisher FROM Publishers;
END;

--Functions
CREATE OR REPLACE FUNCTION GetMaxOrderID RETURN NUMBER IS
   max_order_id NUMBER;
BEGIN
   SELECT MAX(orderID) INTO max_order_id FROM ORDERS;
   RETURN max_order_id;
END;

CREATE OR REPLACE FUNCTION GetMaxUserID RETURN NUMBER IS
   max_user_id NUMBER;
BEGIN
   SELECT MAX(userId) INTO max_user_id FROM users;
   RETURN max_user_id;
END;

--Triggers
CREATE OR REPLACE TRIGGER RemoveFromCartTrigger
AFTER INSERT ON Orders
FOR EACH ROW
DECLARE
    v_seller_id NUMBER(10);
    v_buyer_id NUMBER(10);
    v_book_id NUMBER(10);
BEGIN
    v_seller_id := :NEW.sellerID;
    v_buyer_id := :NEW.buyerID;
    v_book_id := :NEW.bookID;
    
    DELETE FROM Cart
    WHERE sellerID = v_seller_id
    AND buyerID = v_buyer_id
    AND bookID = v_book_id;
END;
/

CREATE SEQUENCE message_seq_1
    START WITH 1
    INCREMENT BY 1
    CACHE 20;


CREATE OR REPLACE TRIGGER message_before_insert
BEFORE INSERT ON MESSAGES
FOR EACH ROW
BEGIN
  SELECT message_seq_1.NEXTVAL
  INTO :new.MESSAGEID
  FROM dual;
END;

CREATE OR REPLACE TRIGGER trg_remove_report
AFTER DELETE ON Report
FOR EACH ROW
BEGIN
    UPDATE Users
    SET reported = 0
    WHERE userID = :OLD.accusedID;
END;

