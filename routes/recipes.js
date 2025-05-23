var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");

// router.get("/", (req, res) => res.send("im here"));

// החלק הראשון של   /recipes - שורה 9
router.get("/", async (req, res, next) => {
  try {
    const previews = await recipes_utils.getRandomRecipesPreview(5);
    res.status(200).send({ recipes: previews });
  } catch (error) {
    next(error);
  }
});



/**
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
    
    // הוספת צפייה למשתמש המחובר, אם יש
    if (req.session && req.session.user_id) {
      await recipes_utils.markRecipeAsViewed(req.session.user_id, req.params.recipeId);
    }
    
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

//search line 43 (recipes)
router.get("/search", async (req, res, next) => {
  try {
    const query = req.query.query;

    if (!query || query.trim() === "") {
      return res.status(200).send({ recipes: [] });
    }

    const recipes = await recipes_utils.searchRecipesByQuery(query);
    res.status(200).send({ recipes });
  } catch (error) {
    next(error);
  }
});


// שורה 111 - יצירת מתכון חדש
const DButils = require("./utils/DButils");

router.post("/new", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;

    // אם המשתמש לא מחובר – שלחי 401
    if (!user_id) {
      return res.status(401).send({ message: "Unauthorized – please login first" });
    }

    const {
      title,
      image,
      prep_time_minutes,
      popularity_score,
      tags,
      has_gluten,
      ingredients,
      instructions,
      servings
    } = req.body;

    // בדיקה בסיסית שכל השדות קיימים
    if (!title || !ingredients || !instructions) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    // שמירה לטבלת recipes (לדוגמה, צריכה להתאים למסד שלך)
    await DButils.execQuery(`
      INSERT INTO recipes (
        user_id, title, image, prep_time_minutes, popularity_score,
        tags, has_gluten, ingredients, instructions, servings
      )
      VALUES (
        '${user_id}', '${title}', '${image}', '${prep_time_minutes}', '${popularity_score}',
        '${tags}', '${has_gluten}', '${JSON.stringify(ingredients)}', '${instructions}', '${servings}'
      )
    `);

    res.status(201).send({
      message: "Recipe successfully created",
      recipe: {
        title,
        image,
        prep_time_minutes,
        popularity_score,
        tags,
        has_gluten,
        ingredients,
        instructions,
        servings
      }
    });

  } catch (error) {
    next(error);
  }
});


router.get("/random", async (req, res, next) => {
  try {
    const randomRecipes = await recipes_utils.getRandomRecipesPreview(3);
    res.status(200).send({ recipes: randomRecipes });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
