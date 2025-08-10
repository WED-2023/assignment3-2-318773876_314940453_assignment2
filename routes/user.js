var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");

/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM users").then((users) => {
      if (users.find((x) => x.user_id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});


/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await user_utils.markAsFavorite(user_id,recipe_id);
    res.status(200).send("The Recipe successfully saved as favorite");
    } catch(error){
    next(error);
  }
})

/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    let recipes_id_array = [];

    //recipes_id.map((element) => recipes_id_array.push(element.recipe_id));
    //const results = await recipe_utils.getRecipesPreview(recipes_id_array, user_id);
    
    const results = await recipe_utils.getRecipesPreview(recipes_id, user_id);
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});


/**
 * This path returns the current logged-in user status
 */
router.get("/status", async (req, res) => {
  if (req.session && req.session.user_id) {
    try {
      const user = (
        await DButils.execQuery(
          `SELECT username FROM users WHERE user_id = '${req.session.user_id}'`
        )
      )[0];
      res.status(200).send({ is_authenticated: true, username: user.username });
    } catch (err) {
      res.status(500).send({ is_authenticated: false, message: "Server error" });
    }
  } else {
    res.status(200).send({ is_authenticated: false });
  }
});


/**
 * This path returns the last 3 recipes viewed by the logged-in user
 */
router.get("/recent", async (req, res, next) => {
  try {
    const user_id = req.user_id;
    const recent = await user_utils.getLastViewedRecipes(user_id);

    const recipes = await recipe_utils.getRecipesPreview(recent, user_id);

    res.status(200).send({ recipes });
  } catch (err) {
    next(err);
  }
});


/**
 * This path returns the recipes created by the logged-in user
 */
// router.get("/recipes", async (req, res, next) => {
//   try {
//     const user_id = req.session?.user_id;

//     if (!user_id) {
//       return res.status(401).send({ message: "Unauthorized – login required" });
//     }

//     const userRecipes = await user_utils.getUserRecipes(user_id);

//     res.status(200).send({ recipes: userRecipes });
//   } catch (error) {
//     next(error);
//   }
// });

router.get("/recipes", async (req, res, next) => {
  try {
    const user_id = req.session?.user_id;
    if (!user_id) return res.status(401).send({ message: "Unauthorized – login required" });

    // ניקח את ה־IDs של המתכונים שלי ונציין שמקורם פנימי
    const entries = await DButils.execQuery(`
      SELECT recipe_id, 'internal' AS source
      FROM recipes
      WHERE user_id = '${user_id}'
      ORDER BY recipe_id DESC
    `);

    // נבנה previews עקביים (כולל viewed/favorite לפי טבלאות למשתמש)
    const previews = await recipe_utils.getRecipesPreview(entries, user_id);
    res.status(200).send({ recipes: previews });
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns 3 family recipes associated with the logged-in user
 */
router.get("/family", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;

    const result = await DButils.execQuery(`
      SELECT recipe_id, recipe_name, when_prepared, ingredients, preparation_method, image_url
      FROM family_recipes
      WHERE user_id = '${user_id}'
      LIMIT 3
    `);

    res.status(200).send({ recipes: result });
  } catch (error) {
    next(error);
  }
});



module.exports = router;
