module.exports = {
    "key" : process.env.BANG_S3_KEY,
    "secret" : process.env.BANG_S3_SECRET,
    "region" : "ap-northeast-2", //-1은 도쿄, -2는 서울을 의미한다.
    "bucket" : "bangpjt",
    //아래 image--- 키 이름은 임의로 정해도 된다.
    "mypages": {"imageDir": "mypages"},
    "posts": {"imageDir": "posts"},
    "imageACL" : "public-read"
}

