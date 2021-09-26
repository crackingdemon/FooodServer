const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const port = process.env.PORT || 3000;
const app = express();
const axios = require("axios");
require("dotenv").config();
const JWT_SECRET = process.env.jwt;
// const Data=require('./data');

const bcrypt = require("bcryptjs");
const salt = 10;

app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(cookieParser());
app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});

// making connnection with our database
mongoose.connect(process.env.mongodb, {
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

//  schema for user auth
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

//  schema for admin auth
const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { collection: "admins" }
);

const Admin = mongoose.model("Admin", adminSchema);

// schema for products
const productSchema = new mongoose.Schema(
  {
    sno: { type: Number },
    name: { type: String },
    packing: { type: String},
    shipper: { type: String },
    batch: { type: String },
    quantity: { type: Number },
    rate: { type: Number },
  },
  { collection: "products" }
);

const Product = mongoose.model("Product", productSchema);

// schema for our Orders
const userOrder = new mongoose.Schema(
  {
    user: { type: String },
    time: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    orders: [],
  },
  { collection: "orders" }
);

const Order = mongoose.model("Order", userOrder);

// schema for making order archives
const archiveOrder = new mongoose.Schema(
  {
    user: { type: String },
    time: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    orders: [],
  },
  { collection: "archives" }
);

const Archive = mongoose.model("Archive", archiveOrder);

// veryfying the token
const verifyToken = (token) => {
  try {
    const verify = jwt.verify(token, JWT_SECRET);
    if (verify.type === "user") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(JSON.stringify(error), "error");
    return false;
  }
};

// veryfying the admin token
const verifyAdminToken = (token) => {
  try {
    const verify = jwt.verify(token, JWT_SECRET);
    if (verify.type === "admin") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(JSON.stringify(error), "error");
    return false;
  }
};

// user login function
const verifyUserLogin = async (email, password) => {
  try {
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return { status: "error", error: "user not found" };
    }
    if (await bcrypt.compare(password, user.password)) {
      // creating a token
      token = jwt.sign(
        { id: user._id, username: user.email, type: "user" },
        JWT_SECRET
      );
      return { status: "ok", data: token };
    }
    return { status: "error", error: "invalid password" };
  } catch (error) {
    console.log(error);
    return { status: "error", error: "timed out" };
  }
};

// admin login function

const verifyAdminLogin = async (email, password) => {
  try {
    const admin = await Admin.findOne({ email }).lean();
    console.log(admin);
    if (!admin) {
      return { status: "error", error: "user not found" };
    }
    if (await bcrypt.compare(password, admin.password)) {
      // creating a token
      token = jwt.sign(
        { id: admin._id, username: admin.email, type: "admin" },
        JWT_SECRET
      );

      return { status: "ok", data: token };
    }
    return { status: "error", error: "invalid password" };
  } catch (error) {
    return { status: "error", error: "timed out" };
  }
};

// user features

// app.post('/add-order',async (req,res)=>{
//     const {token}=req.cookies;
//     const verify = jwt.verify(token,JWT_SECRET);
//     try {
//         const username = await Draft.find({user:verify.username});
//         const data  = await Product.find({sno:req.body.sno});
//         console.log(username.length,data);
//         const amount = parseInt(data.rate)*req.body.quantity;
//         if(username.length===0){
//             const draft = new Draft;
//             draft.user=verify.username;
//             draft.data.push({data:data,amount:amount});
//             draft.save((err)=>{console.log(err);});
//         }else{
//             username.data.push({data:data,amount:amount});
//             username.save();
//         }
//     } catch (error) {
//         console.log(JSON.stringify(error));
//         return res.json({status:'error',error:JSON.stringify(error)});
//     }

// });

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

// user can place a order

app.post("/place-order", async (req, res) => {
  console.log("yayy");
  const { token } = req.cookies;
  const verify = jwt.verify(token, JWT_SECRET);
  var now = new Date(); // Fri Feb 20 2015 19:29:31 GMT+0530 (India Standard Time)
  // var isoDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
  try {
    const order = new Order();
    order.user = verify.username;
    order.time = now;
    order.orders.push(req.body);
    order.save((err) => {
      if (err) {
        throw err;
      } else {
        return res.json({ status: "ok", data: "order updated sucessfully" });
      }
    });
  } catch (error) {
    console.log(JSON.stringify(error));
    return res.json({ status: "error", error: JSON.stringify(error) });
  }
});

// update the order
app.post("/update-order", async (req, res) => {
  console.log("yayy");
  const { token } = req.cookies;
  const verify = jwt.verify(token, JWT_SECRET);
  var now = new Date();
  try {
    Order.find({ _id: req.body.id }, (err, order) => {
      console.log(req.body.data);
      order = order[0];
      order.user = verify.username;
      order.time = now;
      order.updatedAt = Date.now();
      order.orders = [req.body.data];
      order.save(function (err) {
        if (err) {
          console.error(err);
          return res.json({ status: "error", data: JSON.stringify(err) });
        } else {
          res.json({ status: "ok", data: "updated the order" });
        }
      });
    });
  } catch (error) {
    console.log(JSON.stringify(error));
    return res.json({ status: "error", error: JSON.stringify(error) });
  }
});

// edit the order

app.post("/edit-order", async (req, res) => {
  const data = req.body;
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    try {
      const Data = await Product.find({}).sort({ sno: 1 });
      const order = await Order.find({ _id: data.id });
      console.log(order);
      res.render("changeorder", {
        data: Data,
        username: verify.username,
        order: order,
      });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/login");
  }
});

// save to draft

app.post("/save-draft", (req, res) => {
  console.log(req.body);
  res.json({ status: "ok", data: "data send successfully" });
});

// user routes

app.get("/", async (req, res) => {
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    try {
      const prod = await Product.find({}).sort({ sno: 1 });
      const order = await Order.find({ user: verify.username });
      const showdata = {
        products: prod.length,
        orders: order.length,
      };
      res.render("dashboard", { data: showdata, username: verify.username });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/login");
  }
});
app.get("/products", async (req, res) => {
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    try {
      const Data = await Product.find({}).sort({ sno: 1 });
      res.render("products", { data: Data, username: verify.username });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/login");
  }
});
// app.get('/updates',(req,res)=>{
//     const {token}=req.cookies;
//     if(verifyToken(token)){
//         res.render('updates');
//     }else{
//         res.redirect('/login')
//     }
// })
app.get("/orders", async (req, res) => {
  const { token } = req.cookies;
  if (verifyToken(token)) {
    const verify = jwt.verify(token, JWT_SECRET);
    try {
      const verify = jwt.verify(token, JWT_SECRET);
      const Data = await Order.find({ user: verify.username }).sort({
        updatedAt: -1,
      });
      console.log(Data);
      res.render("orders", { data: Data, username: verify.username });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/login");
  }
});

// user dashboard portal

app.get("/login", (req, res) => {
  res.render("login", {
    name: "User Login",
    aname: "Admin",
    route: "/login",
    aroute: "/admin/login",
  });
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    name: "User SignUp",
    aname: "Admin",
    route: "/signup",
    aname: "Login",
    aroute: "/login",
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const response = await verifyUserLogin(email, password);
  if (response.status === "ok") {
    res.cookie("token", token, { maxAge: 2 * 60 * 60 * 1000, httpOnly: true }); // maxAge: 2 hours
    res.redirect("/");
  } else {
    res.json(response);
  }
});

// code for registering a user

app.post("/signup", async (req, res) => {
  const { email, password: plainTextPassword } = req.body;
  const password = await bcrypt.hash(plainTextPassword, salt);

  if (password.length < 5) {
    return res.json({ status: "error", error: "password to small" });
  }
  try {
    const response = await User.create({
      email,
      password,
    });
    console.log(response);
    res.send("successfully logged in");
  } catch (error) {
    console.log(JSON.stringify(error));
    if (error.code === 11000) {
      res.json({ status: "error", error: "email already exists" });
    }
    throw error;
  }
});

// admin get requests

// admin login

app.get("/admin", async (req, res) => {
  const { token } = req.cookies;
  if (verifyAdminToken(token)) {
    try {
      const prod = await Product.find({}).sort({ sno: 1 });
      const order = await Order.find({}).sort({ updatedAt: -1 });
      const showdata = {
        products: prod.length,
        orders: order.length,
      };
      res.render("./admin/admin", { data: showdata, order: order });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/admin/login");
  }
});

app.get("/admin/login", (req, res) => {
  res.render("login", {
    name: "Admin Login",
    aname: "User",
    route: "/admin/login",
    aroute: "/login",
  });
});

app.get("/admin/products", async (req, res) => {
  const { token } = req.cookies;
  if (verifyAdminToken(token)) {
    try {
      const Data = await Product.find({}).sort({ sno: 1 });
      res.render("./admin/adminproducts", { data: Data });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/admin/login");
  }
});

app.get("/admin/update-products", (req, res) => {
  const { token } = req.cookies;
  if (verifyAdminToken(token)) {
    res.render("./admin/adminupdate-products");
  } else {
    res.redirect("/admin/login");
  }
});
app.get("/admin/archives", async (req, res) => {
  const { token } = req.cookies;
  if (verifyAdminToken(token)) {
    try {
      const Data = await Archive.find({}).sort({ updatedAt: -1 });
      console.log(Data);

      res.render("./admin/archives", { data: Data });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/admin/login");
  }
});
app.get("/admin/updates", async (req, res) => {
  const { token } = req.cookies;
  if (verifyAdminToken(token)) {
    try {
      const Data = await Order.find({}).sort({ updatedAt: -1 });
      console.log(Data);
      res.render("./admin/adminupdates", { data: Data });
    } catch (error) {
      return res.json({
        status: "error",
        error: "data took too long to fetch try again",
      });
    }
  } else {
    res.redirect("/admin/login");
  }
});

// admin post request

app.post("/admin/login", async (req, res) => {
  // maxAge: 2 hours
  const { email, password } = req.body;
  const response = await verifyAdminLogin(email, password);
  if (response.status === "ok") {
    res.cookie("token", token, { maxAge: 2 * 60 * 60 * 1000, httpOnly: true }); // maxAge: 2 hours
    res.redirect("/admin");
  } else {
    res.json(response);
  }
});

app.post("/product/remove", (req, res) => {
  try {
    Product.findOneAndRemove({ sno: req.body.sno }, function (err) {
      if (!err) {
        console.log("deleted");
      } else {
        throw err;
        console.log(err);
      }
    });
  } catch (error) {
    return res.json({ status: "error", error: JSON.stringify(error) });
  }
});

//add to archive features
app.post("/admin/add-to-archive", async (req, res) => {
  const data = req.body;

  try {
    const archive = new Archive();
    let order = await Order.find({ _id: data.id });
    order = order[0];

    console.log(order);
    archive.orders = order.orders;
    archive.user = order.user;

    Order.findOneAndDelete({ _id: data.id }, function (err, docs) {
      if (err) {
        return res.json({ status: "error", data: JSON.stringify(err) });
        console.log(err);
      } else {
        archive.save(function (err) {
          if (err) {
            console.error(err);
            return res.json({ status: "error", data: JSON.stringify(err) });
          } else {
            res.json({ status: "ok", data: "added to archive" });
          }
        });
        console.log("Deleted User : ", docs);
      }
    });
  } catch (error) {
    console.log(error);
  }
});

// admin add / update products

app.post("/admin/edit-order", async (req, res) => {
  const data = req.body;

  try {
    const Data = await Product.find({}).sort({ sno: 1 });
    const order = await Order.find({ _id: data.id });
    console.log(order);
    res.render("./admin/updateproducts", { data: Data, order: order });
  } catch (error) {
    return res.json({
      status: "error",
      error: "data took too long to fetch try again",
    });
  }
});

app.post("/product/add-update", async (req, res) => {
  const data = req.body;
  await Product.find({ sno: data.sno }, async (err, product) => {
    console.log(product.length);
    if (product.length != 0) {
      console.log("inside");
      product = product[0];
      product.sno = data.sno;
      product.name = data.productname;
      product.packing = data.packing;
      product.shipper = data.shipper;
      product.batch = data.batch;
      product.rate = parseInt(data.rate);
      console.log(product);
      await product.save(function (err) {
        if (err) {
          console.error("ERROR!");
          return res.json({ status: "error", data: JSON.stringify(err) });
        } else {
          return res.json({ status: "ok", data: "updated the product" });
        }
      });
    } else {
      try {
        const product = new Product({
          sno: Number(data.sno),
          name: data.productname,
          packing: data.packing,
          shipper: data.shipper,
          batch: data.batch,
          quantity: 1,
          rate: Number(data.rate),
        });
        console.log(product);
        await product.save(function (err, result) {
          console.log(result);
          if (err) {
            console.log(err);
            return res.json({ status: "error", data: JSON.stringify(err) });
          }
          return res.json({ status: "ok", data: "product added successfully" });
        });
      } catch (error) {
        return res.json({ status: "error", data: JSON.stringify(error) });
      }
    }
  });
});

// download as excel

app.post("/user/get-data", async (req, res) => {
  try {
    const Data = await Order.find({});
    console.log(Data);
    res.send(Data);
  } catch (error) {
    return res.json({
      status: "error",
      error: "data took too long to fetch try again",
    });
  }
});

app.post("/user/get-seperate-data", async (req, res) => {
  try {
    console.log(req.body.id);
    const Data = await Order.find({ _id: req.body.id });
    console.log(Data);
    res.send(Data);
  } catch (error) {
    return res.json({
      status: "error",
      error: "data took too long to fetch try again",
    });
  }
});

// app.get('/github/:username',async (req,res)=>{
//     try {
//         const url=encodeURI(`https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`)

//         const response = await axios.get(url);
//         console.log(response);
//         res.json(response.data);
//       } catch (error) {
//         console.error(error);
//       }

// })

// -- temp store data to server

// app.get('/save',(req,res)=>{
//     const {data}=Data;
//     console.log(data)
//     for(let i=1;i<data.length;i++){
//         const product = new Product ({
//             sno:data[i][0],
//             name:data[i][1],
//             packing:data[i][2],
//             shipper:data[i][3],
//             batch:data[i][4],
//             quantity:data[i][5],
//             rate:data[i][6]
//         })
//         console.log(product);
//         product.save();
//     }
//     res.json({status:'saved'});
// })

// !--------------------------
