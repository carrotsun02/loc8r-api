const mongoose = require('mongoose');
const Loc = mongoose.model('Location');
const User = mongoose.model('User');

const getAuthor = async (req, res, callback) => { // async 함수로 변경
    if(req.auth && req.auth.email){
        try {
            // await를 사용하여 Promise 기반으로 쿼리 실행
            const user = await User.findOne({email: req.auth.email}).exec(); 
            
            if(!user){
                return res.status(404).json({"message": "User not found"});
            }
            
            // 콜백에 사용자 이름을 전달하여 원래 로직 유지
            callback(req, res, user.name); 

        } catch (err) {
            console.log(err);
            return res.status(404).json(err);
        }
    } else {
        return res.status(404).json({"message": "User not found"});
    }
}

const doSetAverageRating = async (location) => {
    if (location.reviews && location.reviews.length > 0 ) {
        const count = location.reviews.length;
        const total = location.reviews.reduce((acc, {rating}) => {
            return acc + rating;
        }, 0);

        location.rating = parseInt(total / count, 10);
        try {
            await location.save();
            console.log(`Average rating updated to ${location.rating}`);
        } catch (err) {
            console.log(err);
        }
    }
};

const updatedAverageRating = async (locationId) => {
    try {
        const location = await Loc.findById(locationId).select('rating reviews').exec();
        if (location) {
            await doSetAverageRating(location);
        }
    } catch (err) {
        console.log(err);
    }
};

const doAddReview = async (req, res, location, author) => { // async 함수로 변경
    if (!location) {
        // 이 경로는 사실상 위의 reviewsCreate에서 걸러지므로 실행되지 않을 가능성이 높음
        res.status(404).json({"message": "Location not found"});
    } else {
        const {rating, reviewText} = req.body;
        location.reviews.push({
            author,
            rating,
            reviewText
        });
        
        try {
            // location.save()를 await로 변경
            const savedLocation = await location.save(); 
            
            // updateAverageRating을 호출합니다. (오타 수정: updatedAverageRating)
            await updatedAverageRating(savedLocation._id); 
            
            const thisReview = savedLocation.reviews.slice(-1).pop();
            res.status(201).json(thisReview);
        } catch (err) {
            res.status(400).json(err);
        }
    }
};

const reviewsCreate = (req, res) => {
    getAuthor(req, res, async (req, res, userName) => { // 콜백 함수를 async로 선언
        const locationId = req.params.locationid;
        if (locationId) {
            try {
                // Loc.findById 쿼리를 await로 변경
                const location = await Loc.findById(locationId).select('reviews').exec(); 
                
                if (location) {
                    // doAddReview도 async/await으로 변경하는 경우
                    await doAddReview(req, res, location, userName);
                } else {
                    res.status(404).json({"message": "Location not found"});
                }
            } catch (err) {
                res.status(400).json(err);
            }
        } else {
            res.status(404).json({"message": "Location not found"});
        }
    });
};

const reviewsReadOne = async (req, res) => {
    try {
        const location = await Loc.findById(req.params.locationid).select('name reviews').exec();
        if (!location) {
            return res
                .status(404)
                .json({ "message": "location not found" });
        }
        if (location.reviews && location.reviews.length > 0) {
            const review = location.reviews.id(req.params.reviewid);
            if (!review) {
                return res
                    .status(404)
                    .json({ "message": "review not found" });
            }
            const response = {
                location: {
                    name: location.name,
                    id: req.params.locationid
                },
                review
            };
            return res
                .status(200)
                .json(response);
        } else {
            return res
                .status(404)
                .json({ "message": "No reviews found" });
        }
    } catch (err) {
        return res
            .status(400)
            .json(err);
    }
};

const reviewsUpdateOne = async (req, res) => {
    if (!req.params.locationid || !req.params.reviewid) {
        return res.status(404).json({ "message": "Not found, locationid and reviewid are both required" });
    }

    try {
        const location = await Loc.findById(req.params.locationid).select('reviews').exec();
        if (!location) {
            return res.status(404).json({ "message": "Location not found" });
        }

        if (location.reviews && location.reviews.length > 0) {
            const thisReview = location.reviews.id(req.params.reviewid);
            if (!thisReview) {
                return res.status(404).json({ "message": "Review not found" });
            }

            thisReview.author = req.body.author;
            thisReview.rating = req.body.rating;
            thisReview.reviewText = req.body.reviewText;

            const updatedLocation = await location.save();
            await updatedAverageRating(updatedLocation._id);
            return res.status(200).json(thisReview);
        } else {
            return res.status(404).json({ "message": "No review to update" });
        }
    } catch (err) {
        return res.status(400).json(err);
    }
};

const reviewsDeleteOne = async (req, res) => {
    const { locationid, reviewid } = req.params;
    if (!locationid || !reviewid) {
        return res.status(404).json({ 'message': 'Not found, locationid and reviewid are both required' });
    }

    try {
        const location = await Loc.findById(locationid).select('reviews').exec();
        if (!location) {
            return res.status(404).json({ 'message': 'Location not found' });
        }

        if (location.reviews && location.reviews.length > 0) {
            const review = location.reviews.id(reviewid);
            if (!review) {
                return res.status(404).json({ 'message': 'Review not found' });
            }

            review.deleteOne();
            await location.save();
            await updatedAverageRating(location._id);
            return res.status(204).json(null);
        } else {
            return res.status(404).json({ 'message': 'No Review to delete' });
        }
    } catch (err) {
        return res.status(400).json(err);
    }
};

module.exports = {
    reviewsCreate,
    reviewsReadOne,
    reviewsUpdateOne,
    reviewsDeleteOne
};
