import { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './FB.css';

const EXAMPLE_SETS = [
    {
        label: 'Breakfast cereal',
        ingredients: 'corn flour, sugar, whole grain oats, salt, malt extract, artificial flavor',
    },
    {
        label: 'Instant noodles',
        ingredients:
            'wheat flour, palm oil, salt, monosodium glutamate, flavor enhancer, dehydrated vegetables',
    },
    {
        label: 'Protein bar',
        ingredients:
            'whey protein concentrate, soy protein isolate, sugar, cocoa powder, palm kernel oil, emulsifier, flavoring',
    },
];

const API_BASE =
    (typeof process !== 'undefined' &&
        process?.env &&
        process.env.REACT_APP_API_URL &&
        process.env.REACT_APP_API_URL.trim()) ||
    'https://foodbuddy-backend-x9qp.onrender.com';

function normalizeIngredients(input) {
    return String(input || '')
        .replace(/[;\n]+/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
}

function safeDetailMessage(detail) {
    if (!detail) return null;
    if (typeof detail === 'string') return detail;
    try {
        return JSON.stringify(detail);
    } catch {
        return String(detail);
    }
}

function inferIconAndCategory(name) {
    const lower = name.toLowerCase();

    let icon = '🥦';
    let category = 'Neutral';

    if (
        lower.includes('sugar') ||
        lower.includes('syrup') ||
        lower.includes('glucose') ||
        lower.includes('fructose') ||
        lower.includes('dextrose') ||
        lower.includes('maltodextrin')
    ) {
        icon = '🍬';
        category = 'Sugar';
    } else if (lower.includes('salt') || lower.includes('sodium')) {
        icon = '🧂';
        category = 'Sodium';
    } else if (
        lower.includes('oil') ||
        lower.includes('fat') ||
        lower.includes('kernel') ||
        lower.includes('shortening')
    ) {
        icon = '🧈';
        category = 'Fats / oils';
    } else if (lower.includes('nitrate') || lower.includes('nitrite')) {
        icon = '🧪';
        category = 'Preservative';
    } else if (lower.includes('flour') || lower.includes('starch')) {
        icon = '🌾';
        category = 'Carbohydrate';
    } else if (lower.includes('protein') || lower.includes('whey') || lower.includes('casein')) {
        icon = '💪';
        category = 'Protein';
    } else if (lower.includes('fiber') || lower.includes('oats') || lower.includes('whole grain')) {
        icon = '🌿';
        category = 'Whole grains / fiber';
    }

    return { icon, category };
}

function parseAnalysisIntoCards(analysisText) {
    if (!analysisText) return [];

    const lines = analysisText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

    const bulletLines = lines.filter((l) => /^\s*(•|-)\s+/.test(l));
    const source = bulletLines.length > 0 ? bulletLines : lines;

    const cards = [];

    for (const line of source) {
        const withoutBullet = line.replace(/^\s*(•|-)\s+/, '').trim();
        const idx = withoutBullet.indexOf(':');
        const name = (idx >= 0 ? withoutBullet.slice(0, idx) : withoutBullet).trim();
        const explanation = (idx >= 0 ? withoutBullet.slice(idx + 1) : '').trim();

        if (!name) continue;

        const { icon, category } = inferIconAndCategory(name);
        cards.push({
            name,
            explanation:
                explanation ||
                'No explanation was returned for this ingredient. (Tip: update the backend to return structured cards.)',
            icon,
            category,
        });
    }

    const seen = new Set();
    return cards.filter((c) => {
        const key = c.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ✅ If risk_score is 0..1 where higher = worse:
function levelFromRiskScore(score01) {
    if (typeof score01 !== 'number' || Number.isNaN(score01)) return null;

    // tweak thresholds as you like
    if (score01 < 0.33) return 'low';
    if (score01 < 0.67) return 'medium';
    return 'high';
}

export default function FB() {
    const [ingredients, setIngredients] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [riskLevel, setRiskLevel] = useState(null);
    const [riskFactors, setRiskFactors] = useState([]);
    const [riskScore, setRiskScore] = useState(null); // formatted string for display
    const [riskScoreRaw, setRiskScoreRaw] = useState(null); // numeric source of truth

    const [serverCards, setServerCards] = useState(null);

    const abortRef = useRef(null);

    const callBackend = async (value) => {
        const cleaned = normalizeIngredients(value);
        if (!cleaned) return;

        setError('');
        setAnalysis('');
        setServerCards(null);
        setRiskLevel(null);
        setRiskFactors([]);
        setRiskScore(null);
        setRiskScoreRaw(null);
        setLoading(true);

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const response = await axios.post(
                `${API_BASE}/analyze`,
                { ingredients: cleaned },
                { signal: controller.signal }
            );

            const data = response.data || {};
            const text = data.analysis || '';
            setAnalysis(text);

            setServerCards(Array.isArray(data.cards) ? data.cards : null);

            const rawScore = typeof data.risk_score === 'number' ? data.risk_score : null;
            setRiskScoreRaw(rawScore);
            setRiskScore(rawScore !== null ? rawScore.toFixed(2) : null);

            const rf = Array.isArray(data.risk_factors) ? data.risk_factors : [];
            setRiskFactors(Array.from(new Set(rf)));

            // ⚠️ BACKEND risk_level might be wrong; only use as fallback
            const backendLevel = data.risk_level || null;

            // ✅ compute level from score if we have it
            const computed = rawScore !== null ? levelFromRiskScore(rawScore) : null;

            setRiskLevel(computed || backendLevel);
        } catch (err) {
            if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;

            console.error('Error calling backend:', err);
            const detail = safeDetailMessage(err?.response?.data?.detail);
            setError(
                detail
                    ? `FoodBuddy couldn’t analyze this label: ${detail}`
                    : 'Could not reach the FoodBuddy assistant. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const analyzeIngredients = async () => {
        if (!ingredients.trim()) {
            setError('Please write ingredients to proceed');
            return;
        }
        await callBackend(ingredients);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            analyzeIngredients();
        }
    };

    const handleExampleClick = (example) => {
        setIngredients(example.ingredients);
        callBackend(example.ingredients);
    };

    const cards = useMemo(() => {
        if (Array.isArray(serverCards) && serverCards.length > 0) {
            return serverCards.map((c) => {
                const name = String(c?.name || '').trim() || 'Unnamed ingredient';
                const explanation = String(c?.explanation || c?.summary || '').trim() || '—';
                const { icon, category } = inferIconAndCategory(name);
                return {
                    name,
                    explanation,
                    icon: c?.icon || icon,
                    category: c?.category || category,
                };
            });
        }
        return parseAnalysisIntoCards(analysis);
    }, [analysis, serverCards]);

    const renderRiskStrip = () => {
        if (!riskLevel) return null;

        // ✅ Match copy to your intended meaning: higher score => more concern
        let label = 'Overall:';
        if (riskLevel === 'low') label = 'Overall: safe to consume';
        if (riskLevel === 'medium') label = 'Overall: some ingredients need to be paid attention to';
        if (riskLevel === 'high') label = 'Overall: highly unsafe for consumption';

        return (
            <div className={`summary-strip summary-strip--${riskLevel}`}>
                <div className="summary-main">
                    {label}
                    {riskScore !== null && (
                        <span style={{ marginLeft: 6, fontWeight: 400, fontSize: '0.8rem' }}>
              (score {riskScore})
            </span>
                    )}
                </div>

                {riskFactors && riskFactors.length > 0 && (
                    <div className="summary-tags">
                        {riskFactors.map((tag) => (
                            <span key={tag} className="summary-tag">
                {tag}
              </span>
                        ))}
                    </div>
                )}

                <p style={{ marginTop: 6, fontSize: '0.78rem', color: '#4b5563' }}>
                    Heads up: this score is a rough estimate from the ingredient list — not medical advice.
                </p>
            </div>
        );
    };

    return (
        <div className="lens-root">
            <header className="lens-header">
                <div className="lens-brand">
                    <div className="lens-logo">🥗</div>
                    <div>
                        <h1 className="lens-title">FoodBuddy</h1>
                        <p className="lens-tagline">
                            Your quick, honest companion to decode food labels!
                        </p>
                    </div>
                </div>
            </header>

            <main className="lens-main">
                <section className="lens-main-grid">
                    <div className="lens-panel lens-input-panel">
                        <div className="section-box">
                            <h2 className="panel-title">How FoodBuddy works</h2>
                            <ul className="bullets-list">
                                <li>Share your ingredient list in whatever messy format it’s in, FoodBuddy figures it out for you.</li>
                                <li>FoodBuddy zooms in on the usual troublemakers like sugar, salt, oils, and sneaky additives so you don’t have to.
                                </li>
                                <li>Every ingredient gets a simple explanation: what it does in your food and when it might be worth a second look</li>
                            </ul>
                        </div>

                        <div className="input-box section-divider">
                            <h3 className="panel-title">What are you about to eat?</h3>
                            <p className="panel-subtitle">
                                Paste the ingredient list seperated by either commas or new lines.
                            </p>

                            <label htmlFor="ingredients" className="field-label">
                                Ingredients
                            </label>

                            <textarea
                                id="ingredients"
                                className="ingredients-textarea"
                                value={ingredients}
                                onChange={(e) => setIngredients(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="e.g., wheat flour, palm oil, salt, monosodium glutamate…"
                                rows={6}
                            />

                            <div className="examples-row">
                                <span className="examples-label">You can also ask:</span>
                                <div className="examples-chips">
                                    {EXAMPLE_SETS.map((ex) => (
                                        <button
                                            key={ex.label}
                                            type="button"
                                            className="chip-button"
                                            onClick={() => handleExampleClick(ex)}
                                        >
                                            {ex.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={analyzeIngredients}
                                disabled={loading}
                                className="analyze-btn"
                            >
                                {loading ? 'Reading label…' : 'Ask FoodBuddy'}
                            </button>

                            {error && <div className="error-box">{error}</div>}
                        </div>

                        <section className="lens-results-section inline-results section-divider">
                            <div className="breakdown-box">
                                {loading && !analysis && (
                                    <div className="loading-strip">
                                        FoodBuddy is weighing trade-offs…
                                    </div>
                                )}

                                {cards.length > 0 && (
                                    <>
                                        <h2 className="results-title">FoodBuddy’s breakdown</h2>
                                        <div className="cards-grid">
                                            {cards.map((card) => (
                                                <article key={card.name} className="ingredient-card">
                                                    <div className="card-header">
                                                        <div className="card-icon">{card.icon}</div>
                                                        <div>
                                                            <h3 className="card-title">{card.name}</h3>
                                                            <span className="card-chip">{card.category}</span>
                                                        </div>
                                                    </div>
                                                    <p className="card-text">{card.explanation}</p>
                                                    <p
                                                        className="card-text"
                                                        style={{ marginTop: 6, fontSize: '0.78rem', color: '#4b5563' }}
                                                    >
                                                        Quick note: results usually depend on portion size and frequency.
                                                    </p>
                                                </article>
                                            ))}
                                        </div>

                                        {renderRiskStrip()}
                                    </>
                                )}

                                {!loading && !analysis && (
                                    <p className="results-placeholder">
                                        Run an analysis to see what each ingredient does.
                                    </p>
                                )}
                            </div>
                        </section>

                        <p className="disclaimer">
                            This is an educational prototype. Not medical advice.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
