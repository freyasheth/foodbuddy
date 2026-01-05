from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI(title="FoodBuddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    ingredients: str

class AnalyzeResponse(BaseModel):
    analysis: str
    risk_score: float
    risk_level: str
    risk_factors: List[str]

def classify_ingredient(name: str) -> str:
    lower = name.lower().strip()

    if len(lower) <= 1:
        return (
            "This does not look like a real ingredient name. "
            "FoodBuddy is treating it as a placeholder or typo."
        )

    if any(
            kw in lower
            for kw in [
                "sugar",
                "glucose",
                "fructose",
                "sucrose",
                "syrup",
                "dextrose",
                "maltose",
                "honey",
                "corn syrup",
            ]
    ):
        return (
            "Simple sugar or sweetener. Provides quick energy but can spike blood sugar "
            "if eaten in large amounts, especially in drinks or snacks."
        )

    if any(
            kw in lower
            for kw in [
                "aspartame",
                "acesulfame",
                "sucralose",
                "stevia",
                "saccharin",
                "acesulfame k",
            ]
    ):
        return (
            "Intense (low-calorie) sweetener. Reduces calories compared with sugar, but "
            "some people prefer to limit frequent use and watch for individual tolerance."
        )

    if any(kw in lower for kw in ["salt", "sodium", "nacl", "monosodium"]):
        return (
            "Source of sodium. Necessary in small amounts, but high intake is linked to "
            "raised blood pressure. People with hypertension should especially moderate it."
        )

    if any(
            kw in lower
            for kw in [
                "monosodium glutamate",
                "msg",
                "flavour enhancer",
                "flavor enhancer",
                "e621",
            ]
    ):
        return (
            "Flavour enhancer (often MSG). Generally regarded as safe for most people, "
            "but some report sensitivity such as headaches after very large amounts."
        )

    if "oil" in lower or "fat" in lower or "shortening" in lower:
        if "olive" in lower or "canola" in lower or "sunflower" in lower:
            return (
                "Vegetable oil. Primarily a source of fats and calories. When not "
                "overused and minimally processed, can fit into a balanced diet."
            )
        if "palm" in lower or "palm kernel" in lower:
            return (
                "Palm-based fat. Often used in processed foods for texture and shelf "
                "life. Tends to be higher in saturated fat; best kept in moderation."
            )
        if "hydrogenated" in lower or "partially hydrogenated" in lower:
            return (
                "Hydrogenated fat. May contain trans fats, which are strongly linked to "
                "heart-disease risk. Many guidelines recommend avoiding these where possible."
            )
        return (
            "Added oil or fat. Concentrated source of calories; health impact depends "
            "on the type of fat and how often it is eaten."
        )

    if "flour" in lower or "starch" in lower or "semolina" in lower:
        if "whole" in lower or "wholegrain" in lower or "whole grain" in lower:
            return (
                "Whole-grain flour or starch. Provides carbohydrates plus fibre and "
                "micronutrients; generally a better choice than refined flour."
            )
        return (
            "Refined flour or starch. Main source of carbohydrates but relatively low "
            "in fibre and micronutrients compared with whole-grain options."
        )

    if any(
            kw in lower
            for kw in [
                "whey protein",
                "casein",
                "soy protein",
                "pea protein",
                "protein isolate",
            ]
    ):
        return (
            "Concentrated protein ingredient. Helps increase protein content, useful "
            "for satiety and muscle maintenance when part of a balanced diet."
        )

    if any(kw in lower for kw in ["fibre", "fiber", "inulin", "psyllium"]):
        return (
            "Added dietary fibre. Supports digestion and can help with fullness. "
            "May cause bloating in sensitive individuals if consumed in large amounts."
        )

    if any(kw in lower for kw in ["citric acid", "ascorbic acid", "acetic acid"]):
        return (
            "Food acid used for flavour and preservation. Common and generally regarded "
            "as safe at typical food levels."
        )

    if any(
            kw in lower
            for kw in [
                "emulsifier",
                "stabiliser",
                "stabilizer",
                "thickener",
                "lecithin",
                "mono- and diglycerides",
                "xanthan gum",
                "guar gum",
                "carrageenan",
            ]
    ):
        return (
            "Emulsifier or stabiliser. Helps keep texture smooth and ingredients mixed. "
            "Usually eaten in small quantities; some people prefer to limit frequent use."
        )

    if "colour" in lower or "color" in lower or lower.startswith("e1"):
        return (
            "Food colour. Used purely for appearance. Most approved colours are safe "
            "for the general population, though a few individuals may be sensitive."
        )

    if "preservative" in lower or lower.startswith("e2"):
        return (
            "Preservative. Extends shelf life and prevents spoilage. Acceptable within "
            "regulatory limits, but frequent heavy reliance on highly preserved foods "
            "often coincides with more processed diets overall."
        )

    if any(
            kw in lower
            for kw in [
                "vitamin",
                "iron",
                "zinc",
                "calcium",
                "magnesium",
                "folic acid",
                "niacin",
                "riboflavin",
            ]
    ):
        return (
            "Added vitamin or mineral. Used to fortify the food so it contributes more "
            "micronutrients. Generally a positive addition when not over-supplemented."
        )

    if any(ch.isalpha() for ch in lower):
        return (
            "Common food ingredient or blend. Health impact depends on portion size "
            "and the rest of the recipe; usually not a major concern on its own."
        )

    return (
        "Unusual term that FoodBuddy does not recognise as a standard ingredient. "
        "It may be a code, typo, or highly technical name; you may want to cross-check "
        "it if it appears often in your diet."
    )

def score_ingredients(items: List[str]) -> Dict[str, object]:
    lower_joined = " ".join(items).lower()

    score = 0.0
    factors: List[str] = []

    sugar_hits = sum(
        kw in lower_joined
        for kw in ["sugar", "glucose", "fructose", "syrup", "dextrose", "maltose"]
    )
    if sugar_hits:
        score += 0.25 * sugar_hits
        factors.append("Added sugars")

    sodium_hits = sum(kw in lower_joined for kw in ["salt", "sodium", "monosodium"])
    if sodium_hits:
        score += 0.25 * sodium_hits
        factors.append("High sodium / salt")

    if any(kw in lower_joined for kw in ["palm oil", "palm kernel", "hydrogenated"]):
        score += 0.25
        factors.append("Saturated / hydrogenated fats")

    if any(
            kw in lower_joined
            for kw in ["preservative", "flavour enhancer", "flavor enhancer", "e2"]
    ):
        score += 0.15
        factors.append("Preservatives / flavour enhancers")

    if "whole grain" in lower_joined or "wholegrain" in lower_joined:
        score -= 0.15
        factors.append("Whole grains")

    if any(kw in lower_joined for kw in ["fibre", "fiber", "inulin", "psyllium"]):
        score -= 0.1
        factors.append("Added fibre")

    score = max(0.0, min(1.0, score))

    if score < 0.33:
        level = "low"
    elif score < 0.66:
        level = "medium"
    else:
        level = "high"

    if not factors:
        factors = ["No strong positive or negative signals detected"]

    return {"risk_score": score, "risk_level": level, "risk_factors": factors}

def simple_analysis(ingredients: str) -> AnalyzeResponse:
    items = [x.strip() for x in ingredients.split(",") if x.strip()]
    if not items:
        return AnalyzeResponse(
            analysis="No ingredients provided.",
            risk_score=0.0,
            risk_level="low",
            risk_factors=["No data"],
        )

    lines: List[str] = []
    lines.append("Ingredient analysis (rule-based demo):\n")
    lines.append(f"You entered {len(items)} ingredient(s): {', '.join(items)}\n")

    for ing in items:
        explanation = classify_ingredient(ing)
        lines.append(f"• {ing}: {explanation}")

    lines.append(
        "\nThis explanation and risk score are generated by a lightweight, "
        "rule-based model inside FoodBuddy. It highlights patterns (sugar, "
        "sodium, additives, whole grains, fibre) instead of using a full "
        "scientific database."
    )

    scoring = score_ingredients(items)

    return AnalyzeResponse(
        analysis="\n".join(lines),
        risk_score=scoring["risk_score"],
        risk_level=scoring["risk_level"],
        risk_factors=scoring["risk_factors"],
    )

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    return simple_analysis(req.ingredients)

@app.get("/")
async def root():
    return {"message": "FoodBuddy API is running!"}
