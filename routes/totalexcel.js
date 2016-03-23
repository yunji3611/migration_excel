var express = require('express');
var router = express.Router();
var path = require('path');
var async = require('async');
var uuid = require('uuid');
var fs = require('fs');
var mime = require('mime');
var AWS = require('aws-sdk');
var s3Config = require('../config/s3Config');
var bcrypt = require('bcrypt');
var sqlAes = require('./sqlAES');
var XLSX = require('xlsx');
var hexkey =  process.env.HEX_KEY;

sqlAes.setServerKey(serverKey);

router.get('/', function(req, res, next) {

  var workbook = XLSX.readFile(path.join(__dirname, '../uploads/excel', 'bangDB.xlsx'));
  var sheet;

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }
  
  
  function generateSalt(connection, callback){
    bcrypt.genSalt(10, function(err, salt){
      if(err){
        callback(err);
      } else {
        callback(null, salt, connection);
      }
    })
  }

  // user
  function insertMember(salt, connection, callback){
    async.each(sheet, function(item, cb){
      //console.log("test : " + item);
      //console.log("변형되어야 할 값 1: " + item.hashpassword);
      var sql = "insert into bangdb.user(username, email, password) "+
                 "values (?, aes_encrypt(" + connection.escape(item.email) + ", unhex(" + connection.escape(hexkey) + ")), ?) ";
      bcrypt.hash(item.password, salt, function(err, hashPassword){
        if(err){
          callback(err);
        } else {
          //console.log("변형되어야 할 값 : " + sheet[i].hashpassword);
          connection.query(sql, [item.username, hashPassword], function(err, result) {
            if(err){
              callback(err);
            } else {
              var result = {
                "id" : result.insertId,
                "username" : item.username,
                "email" : item.item,
                "password" : hashPassword
              };
              cb(null, result);
            }
          });

        }
      })

    }, function(err, result){
      if(err){
        callback(err);
      } else {
        //console.log(result);
        callback(null, result);
      }
    })
  }

  // color
  /*function insertBoard(connection, callback) {
    async.eachSeries(sheet, function (item, callback) {
      var sql = "insert into bangdb.color(name, code) " +
                "values(?, ?)";
      connection.query(sql, [item.name, item.code], function (err, result) {
        if (err) {
          var err = new Error('color 데이터 생성에 실패하였습니다.');
          callback(err);
        } else {
          var result = {
            "id ": result.insertId,
            "name": item.name,
            "code": item.code
          };
          callback(null);
        }
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }*/

  // hashtag
  function inserttag(connection, callback) {
    async.eachSeries(sheet, function (item, callback) {
      var sql = "insert into bangdb.hashtag(tag) " +
               "values(?)";
      connection.query(sql, [item.tag], function (err, result) {
        if (err) {
          var err = new Error('hashtag 데이터 생성에 실패하였습니다.');
          callback(err);
        } else {
          var result = {
            "id ": result.insertId,
            "tag": item.tag
          };
        }
        callback(null);
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }

  // post
  function insertPost(connection, callback) {
    async.eachSeries(sheet, function (item, callback) {
      var sql = "insert into bangdb.post(content, category, package, user_id, month_price) " +
          "values(?, ?, ?, ?, ?)";
      connection.query(sql, [item.content, item.category, item.package, item.user_id, item.month_price], function (err, result) {
        if (err) {
          var err = new Error('post 데이터 생성에 실패하였습니다.');
          callback(err);
        } else {
          var result = {
            "id ": result.insertId,
            "content": item.content,
            "category": item.category,
            "package": item.package,
            "user_id": item.user_id,
            "month_price": item.month_price
          };
          callback(null);
        }
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }

  //furniture
  function insertFurniture(connection, callback) {
    var resultArr = [];
    async.eachSeries(sheet, function (item, callback) {
      var location = "";
      var mimeType = mime.lookup(item.f_ori_photo_name);
      var filepath = path.join(__dirname, '../uploads/furnitures', item.f_ori_photo_name);
      fs.stat(filepath, function (err, stats) { //경로에 파일이 있는지 확인한다.
        if (err) {
          console.log('요청하신 파일' + item.f_ori_photo_name + '이(가) 존재하지 않습니다.');
          callback(null);
        } else {
          var modifiedfile = uuid.v4() + item.f_ori_photo_name;
          console.log(filepath);
          var body = fs.createReadStream(filepath);
          var s3 = new AWS.S3({
            "accessKeyId": s3Config.key,
            "secretAccessKey": s3Config.secret,
            "region": s3Config.region,
            "params": {
              "Bucket": s3Config.bucket,
              "Key": s3Config.posts.imageDir + "/" + modifiedfile,
              "ACL": s3Config.imageACL,
              "ContentType": mimeType //mime.lookup
            }
          });
          s3.upload({"Body": body}) //pipe역할
            .on('httpUploadProgress', function (event) {
              console.log(event);
            })
            .send(function (err, data) {
              if (err) {
                console.log(err);
                callback(err);
              } else {
                location = data.Location;
                //fs.unlink(filepath, function () {
                //  console.log(filepath + " 파일이 삭제되었습니다...");
                //});
                var sql = "insert into bangdb.furniture(price, brand, name, link, color_id, no, size, post_id, f_photo_path, f_mf_photo_name, f_ori_photo_name ) " +
                  "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                connection.query(sql, [item.price, item.brand, item.name, item.link, item.color_id, item.no, item.size, item.post_id, location, modifiedfile, item.f_ori_photo_name], function (err, result) {
                  if (err) {
                    callback(err);
                  } else {
                    resultArr.push(result.insertId);
                    callback(null);
                  }
                });
              }
            });
        }
      });
    }, function (err) {
      connection.release();
        if (err) {
          console.log("fail!!!");
          callback(err);
        } else {
          console.log("success!!!");
          callback(null);
        }
    });
  }




  // questionary
  function insertQuestionary(connection, callback) {
    async.eachSeries(sheet, function (item, callback) {
      var sql = "insert into bangdb.questionary(id, question) " +
          "values(?, ?)";
      connection.query(sql, [item.id, item.question], function (err, result) {
        if (err) {
          var err = new Error('post 데이터 생성에 실패하였습니다.');
          callback(err);
        } else {
          var result = {
            "id ": item.id,
            "question": item.question
          };
          callback(null);
        }
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }

  // item
  function insertItem(connection, callback) {
    async.eachSeries(sheet, function (item, callback) {
      var sql = "insert into bangdb.item(questionary_id, item_seq, item) " +
                "values(?, ?, ?)";
      connection.query(sql, [item.questionary_id, item.item_seq, item.item], function (err, result) {
        if (err) {
          var err = new Error('post 데이터 생성에 실패하였습니다.');
          callback(err);
        } else {
          var result = {
            "questionary_id": item.questionary_id,
            "item_id": item.item_seq,
            "item": item.item
          };
          callback(null);
        }
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }

  // hashtag_has_post
  function insertHashPost(connection, callback) {
    async.eachSeries(sheet, function (item, callback) {
      var sql = "insert into bangdb.hashtag_has_post(hashtag_id, post_id) " +
                 "values(?, ?)";
      connection.query(sql, [item.hashtag_id, item.post_id], function (err, result) {
        if (err) {
          var err = new Error('post 데이터 생성에 실패하였습니다.');
          callback(err);
        } else {
          var result = {
            "hashtag_id ": item.hashtag_id,
            "post_id": item.post_id
          };
          callback(null);
        }

      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }


  // file
  function insertFile(connection, callback) {
    var resultArr = [];
    async.eachSeries(sheet, function (item, callback) {
      var location = "";
      var mimeType = mime.lookup(item.original_name);
      var filepath = path.join(__dirname, '../uploads/files', item.original_name)
      fs.stat(filepath, function (err, stats) { //경로에 파일이 있는지 확인한다.
        if (err) {
          console.log('요청하신 파일' + item.f_ori_photo_name + '이(가) 존재하지 않습니다.');
          callback(null);
        } else {
          var modifiedfile = uuid.v4() + item.original_name;
          console.log(filepath);
          var body = fs.createReadStream(filepath);
          var s3 = new AWS.S3({
            "accessKeyId": s3Config.key,
            "secretAccessKey": s3Config.secret,
            "region": s3Config.region,
            "params": {
              "Bucket": s3Config.bucket,
              "Key": s3Config.posts.imageDir + "/" + modifiedfile,
              "ACL": s3Config.imageACL,
              "ContentType": mimeType //mime.lookup
            }
          });
          s3.upload({"Body": body}) //pipe역할
              .on('httpUploadProgress', function (event) {
                console.log(event);
              })
              .send(function (err, data) {
                if (err) {
                  console.log(err);
                  callback(err);
                } else {
                  location = data.Location;
                  //fs.unlink(filepath, function () {
                  //  console.log(filepath + " 파일이 삭제되었습니다...");
                  //});
                  var sql = "insert into bangdb.file(file_path, file_name, original_name, post_id) " +
                      "values (?, ?, ?, ?)";
                  connection.query(sql, [location, modifiedfile, item.original_name, item.post_id], function (err, result) {
                    if (err) {
                      connection.release();
                      callback(err);
                    } else {
                      resultArr.push(result.insertId);
                      callback(null);
                    }
                  });
                }
              });
        }
      });
    }, function (err) {
      if (err) {
        connection.release();
        console.log("fail!!!");
        callback(err);
      } else {
        connection.release();
        console.log("success!!!");
        callback(null);
      }
    });
  }



  async.eachSeries(workbook.SheetNames, function (item, callback) {
    var sheet_name = item;
    var worksheet = workbook.Sheets[sheet_name];
    sheet = XLSX.utils.sheet_to_json(worksheet);

    if (sheet_name==="user"){
      async.waterfall([getConnection, generateSalt, insertMember], function(err, result){
        if(err){
          callback(err);
        } else {
          callback(null, result);
        }
      })
    }
    //else if (sheet_name === "color"){
    //  async.waterfall([getConnection, insertBoard], function (err, result) {
    //    if (err) {
    //      callback(err);
    //    } else {
    //      console.log(result);
    //      callback(null);
    //    }
    //  });
    //}
    else if (sheet_name === "hashtag"){
      async.waterfall([getConnection, inserttag], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    }  else if (sheet_name === "post") {
      async.waterfall([getConnection, insertPost], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    }
    else if (sheet_name === "furniture") {
      async.waterfall([getConnection, insertFurniture], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    }
    else if (sheet_name === "questionary"){
      async.waterfall([getConnection, insertQuestionary], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    } else if (sheet_name === "item"){
      async.waterfall([getConnection, insertItem], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    }  else if (sheet_name === "hashtag_has_post"){
      async.waterfall([getConnection, insertHashPost], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    } else if (sheet_name === "file"){
      async.waterfall([getConnection, insertFile], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    }  else {
      console.log(sheet_name + '해당 기능이 없습니다.');
    }
  }, function (err) {
    if (err) {
      next(err);
    } else {
      var success = "insert가 성공하였습니다.";
      res.json(success);
    }
  });
});







//var mimeType = mime.lookup(item.picture);
//var s3 = new AWS.S3({
//  "accessKeyId" : s3Config.key,
//  "secretAccessKey" : s3Config.secret,
//  "region" : s3Config.region,
//  "params" : {
//    "Bucket" : s3Config.bucket,
//    "Key" : s3Config.imageDir + "/" + item.picture,
//    "ACL" : s3Config.imageACL,
//    "ContentType": mimeType //mime.lookup
//  }
//});

module.exports = router;