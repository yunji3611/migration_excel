// 로컬 테스트 계정 config
//var config = {
//    "host" : "localhost",
//    "user" : "root",
//    "password" : "1234",
//    "debug" : true,
//    "database" : "greendb"
//}

// AWS DB 계정 config
//var config = {
//    "host": process.env.BANG_DB_SERVER,
//    "port": process.env.BANG_DB_PORT,
//    "user": process.env.BANG_DB_USERNAME,
//    "password": process.env.BANG_DB_PASSWORD,
//    "database": process.env.BANG_DB,
//    "ssl": "Amazon RDS",
//    "debug": true
//}
var config = {
    "host": "bangserver.czdglqff2woq.ap-northeast-2.rds.amazonaws.com",
    "user": "bangadmin",
    "password": "00003611",
    "debug": true,
    "database" :"bangdb"
};

module.exports = config;
