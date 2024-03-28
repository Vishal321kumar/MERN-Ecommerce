const passport = require('passport')

exports.isAuth=(req,res,done)=>{
return passport.authenticate('jwt');
}

exports.sanitizeUser = (user)=>{
    return { id:user.id , role:user.role}
}

exports.cookieExtractor = function (req) {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies['jwt'];
    }
    // test
    // token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1Zjg3YjIzOTMxNTdjMTZmNWE2NjU3ZCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzEwODUwODA5fQ.wSf7dbQlZsveLO9gOkFojlFJCsZSf6UDUaMHXjgbfJc'
    //iron
    // token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjhhYWMzYjRiNDljYzczZGZiYzkxNSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzExNjE4Njk3fQ.uELy-OG0UFPgQJPAA6JTS6u5ljYWihcdUOWtROEL1IY'
    
    return token;   
};