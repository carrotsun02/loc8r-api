const passport = require('passport');
const LocalStrategy = require('passport-local');
const mongoose = require('mongoose');
const User = mongoose.model('User');

passport.use(new LocalStrategy({
    usernameField: 'email'
    },
    (username, password, done) => {
        // 콜백 방식 대신 Promise 방식으로 변경
        User.findOne({ email: username })
            .then(user => {
                if (!user) {
                    return done(null, false, {
                        message: 'Incorrect email.'
                    });
                } 
                if (!user.validPassword(password)) {
                    return done(null, false, {
                        message: 'Incorrect password.'
                    });
                }
                return done(null, user);
            })
            .catch(err => {
                // DB 검색 중 오류 발생 시, done(err)를 통해 컨트롤러로 에러 전달
                console.error("Mongoose User.findOne Error:", err); // 👈 로그 추가로 원인 파악
                return done(err); 
            });
    }
));