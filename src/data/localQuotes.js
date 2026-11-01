const quote = (id, text) => ({ id, quote: text, author: 'V2' });

export const LOCAL_QUOTES = {
    health: [
        quote('health-1', 'Small choices, repeated with care, become lasting strength.'),
        quote('health-2', 'Rest is not lost time; it is part of the work.'),
        quote('health-3', 'Choose the next healthy action, not the perfect plan.'),
        quote('health-4', 'Your body listens to the routines you repeat.'),
        quote('health-5', 'A little movement can change the direction of a whole day.'),
        quote('health-6', 'Protect your energy before you ask more from it.')
    ],
    career: [
        quote('career-1', 'Build the skill before you need the opportunity.'),
        quote('career-2', 'Consistent useful work has a way of becoming visible.'),
        quote('career-3', 'Clarity grows when you take the next concrete step.'),
        quote('career-4', 'Your reputation is shaped by the promises you keep.'),
        quote('career-5', 'Progress compounds when learning becomes part of the job.'),
        quote('career-6', 'Make today’s work worthy of tomorrow’s ambitions.')
    ],
    code: [
        quote('code-1', 'Make it correct, make it clear, then make it fast.'),
        quote('code-2', 'A small test today prevents a long investigation tomorrow.'),
        quote('code-3', 'Readable code is a kindness to your future self.'),
        quote('code-4', 'Solve the problem in front of you, not every possible problem.'),
        quote('code-5', 'When the system feels complex, shorten the feedback loop.'),
        quote('code-6', 'Good abstractions reveal intent instead of hiding detail.')
    ],
    wisdom: [
        quote('wisdom-1', 'Attention is a vote for the life you are building.'),
        quote('wisdom-2', 'Leave room for new evidence to improve an old opinion.'),
        quote('wisdom-3', 'Patience is active trust in work already underway.'),
        quote('wisdom-4', 'A quieter mind can hear the better question.'),
        quote('wisdom-5', 'What you practice in small moments becomes your character.'),
        quote('wisdom-6', 'Not every urgent thing deserves your attention.')
    ],
    motivation: [
        quote('motivation-1', 'Begin before confidence arrives.'),
        quote('motivation-2', 'Momentum starts with one action small enough to do now.'),
        quote('motivation-3', 'You do not need a perfect day to make meaningful progress.'),
        quote('motivation-4', 'Keep the promise you made to yourself this morning.'),
        quote('motivation-5', 'The next step matters more than the distance remaining.'),
        quote('motivation-6', 'Effort becomes identity when you return to it consistently.')
    ],
    failure: [
        quote('failure-1', 'A setback is information, not an identity.'),
        quote('failure-2', 'Keep the lesson; release the shame.'),
        quote('failure-3', 'A failed attempt still narrows the path to what works.'),
        quote('failure-4', 'Recovery begins when curiosity replaces judgment.'),
        quote('failure-5', 'Adjust the method without abandoning the goal.'),
        quote('failure-6', 'Experience grows wherever honest reflection follows effort.')
    ],
    success: [
        quote('success-1', 'Success is easier to sustain when the process is worth repeating.'),
        quote('success-2', 'Celebrate the milestone, then protect the habits that created it.'),
        quote('success-3', 'Meaningful wins are built from ordinary days used well.'),
        quote('success-4', 'Let progress raise your standards, not your ego.'),
        quote('success-5', 'A clear definition of enough keeps achievement in perspective.'),
        quote('success-6', 'Share the credit and carry the lesson forward.')
    ],
    default: [
        quote('default-1', 'Give this goal one focused action today.'),
        quote('default-2', 'Make the next step simple enough to begin now.'),
        quote('default-3', 'Consistency turns intention into evidence.'),
        quote('default-4', 'A few deliberate minutes can move a meaningful goal forward.'),
        quote('default-5', 'Focus on what you can finish, learn, or improve today.'),
        quote('default-6', 'Return your attention to the person you are becoming.')
    ]
};

const aliases = {
    motivational: 'motivation',
    'software development': 'code',
    programming: 'code',
    coding: 'code'
};

let previousQuoteId = null;

export function getLocalQuote(category) {
    const normalizedCategory = String(category || '').trim().toLowerCase();
    const categoryKey = aliases[normalizedCategory] || normalizedCategory;
    const candidates = LOCAL_QUOTES[categoryKey] || LOCAL_QUOTES.default;
    const available = candidates.filter(({ id }) => id !== previousQuoteId);
    const selected = available[Math.floor(Math.random() * available.length)];
    previousQuoteId = selected.id;

    return {
        quote: selected.quote,
        author: selected.author,
        category,
        source: 'local'
    };
}
