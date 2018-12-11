const express = require('express');
const exphbs = require('express-handlebars');
const request = require('request');
const url = require('url')
const cheerio = require('cheerio');
const uniqid = require('uniqid');
const app = express();

let submitedUrl = [];
let comments = [];


app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

//page 1
app.get("/", (req, res) => {
    res.render("page1")
})

//page 2
app.get("/history", (req, res) => {
    Promise.all(submitedUrl.map(url => new Promise(function (resolve, reject) {
        request.get(url, function (error, response, html) {
            if (!error && response.statusCode == 200) {
                resolve(html)
            }
        });
    }))).then(function (result) {
        const data = [];
        result.map(function (html, index) {
            const $ = cheerio.load(html)
            const price = $(".product-options-bottom > div > span[class='special-price'] > span > .price-wrapper > .price").text();
            let productDescriptionTemp = "";
            $("#description").each(function () {
                productDescriptionTemp = productDescriptionTemp + $(this).text()
            });
            const description = productDescriptionTemp;
            data.push({ price: price, description: description, url: submitedUrl[index] })
        });
        res.render("page2", { data: data })
    })
})

//page 3
app.get("/detail", (req, res) => {
    intendedURL = req.query.input_link;
    hostserver = url.parse(intendedURL).hostname;
    if (hostserver != "fabelio.com") {
        res.send("Not a valid link");
    }
    submitedUrl.push(intendedURL);
    submitedUrl = [... new Set(submitedUrl)]
    request(intendedURL, function (error, response, html) {
        if (!error && response.statusCode == 200) {
            const $ = cheerio.load(html)
            const productCurrentPrice = $(".product-options-bottom > div > span[class='special-price'] > span > .price-wrapper > .price").text();
            let productDescription = "";
            const date = new Date();
            const currentTime = date.getHours() + ":" + date.getMinutes()
            $("#description").each(function () {
                productDescription = productDescription + $(this).text()
            });
            const productImg = $("section[class='product-info__section clearfix'] > div > div > .product-media__wrapper > img");
            // console.log(productImg.attr("src"))
            switch (req.query.action) {
                case "voteup":
                    for (let i = 0; i < comments.length; i++) {
                        if (comments[i].messageID == req.query.id) {
                            comments[i].voteUp++
                        }
                    }
                    break;
                case "votedown":
                    for (let i = 0; i < comments.length; i++) {
                        if (comments[i].messageID == req.query.id) {
                            comments[i].voteDown++
                        }
                    }
                    break;
            }
            if (req.query.comment) {
                let comment = { message: "", messageID: "", voteUp: 0, voteDown: 0, currentURL: "" };
                comment["message"] = req.query.comment;
                comment["messageID"] = uniqid();
                comment["currentURL"] = intendedURL;
                comments.push(comment);
            }
            res.render("page3",
                {
                    productCurrentPrice: productCurrentPrice,
                    productDescription: productDescription,
                    currentTime: currentTime,
                    currentURL: intendedURL,
                    comments: comments
                });
        }
    })
});

const port = process.env.PORT || 3000;
app.listen(port);
console.log('Server Started listening on ' + port);