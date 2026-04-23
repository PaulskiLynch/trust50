"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What is Trust50?",
    answer:
      "Trust50 is the country club model for the digital age: small, curated rooms of up to 50 members where founders and operators help each other make better decisions. The difference is that members can replace leadership when a curator stops serving the room. Members can join up to 4 groups, curators keep 80% of revenue, and most rooms stay free.",
  },
  {
    question: "How is this different from LinkedIn or Slack groups?",
    answer:
      "LinkedIn groups have no real size limit, low reply quality, and no curator accountability. Slack groups are just software: no governance, owner controls everything forever, and groups die when the owner gets busy. Trust50 caps rooms at 50 members, curators get paid, and members can replace curators who stop serving the room.",
  },
  {
    question: "How is this different from Circle, Mighty Networks, or Substack?",
    answer:
      "Circle and Mighty let rooms grow indefinitely, curators own the room forever, and members can join as many as they want. Substack is creator to audience: you consume content, you don't get peer help. Trust50 is different: max 50 per room, max 4 rooms per member, peers help peers, and rooms can replace curators.",
  },
  {
    question: "Who is this for?",
    answer:
      "For members: founders, operators, investors, and experts who want thoughtful replies from people who understand their context, not generic advice from the internet. For curators: people who already answer questions, make introductions, and help others make decisions. If you do this work informally, Trust50 lets you structure it and get paid.",
  },
  {
    question: "How many groups can I join?",
    answer:
      "4 groups maximum. That's roughly 200 direct connections across the network, which is about the limit before useful context starts turning into noise. It is enough reach to be powerful, but still small enough to remember who people are and why they matter. Rooms you curate don't count toward your 4-room limit.",
  },
  {
    question: "How do I join a group?",
    answer:
      "Browse groups, find one that fits your context, and request access. Current members vote, usually around 20% support is needed to get in. If approved, you're in. You can leave anytime.",
  },
  {
    question: "Why are there waiting lists?",
    answer:
      "Rooms are capped at 50 members. When a room fills up, new people join the waiting list. If members leave or get pruned for inactivity, spots open up and people move off the waitlist. A long waiting list is a signal that the room is valuable and that the curator might be underpricing.",
  },
  {
    question: "What kind of questions should I ask?",
    answer:
      "Good questions have context. For example: 'Need a VP Product for 50-person fintech. Remote EU ok. Must have scaled 0 to 1 products before. Unsure about equity vs. cash split.' Or: 'Trying to decide between raising Series A now at a lower valuation or waiting 6 months to hit stronger metrics. What would change your mind?' Bad questions are generic: 'Should I raise money?' or 'How do I hire?' Bring the decision, the tradeoff, or the pattern you're trying to sharpen.",
  },
  {
    question: "Can I message people directly?",
    answer:
      "Yes. You can DM any member in your rooms. Use it for introductions, follow-up, or moving a conversation out of the main thread once the public discussion has done its job.",
  },
  {
    question: "Is my information private?",
    answer:
      "Your profile, name, company, and role, is visible to members of your rooms. Discussions are private to the room: not public and not searchable outside the group. If you ask a sensitive question, you can request that members not share it outside the room.",
  },
  {
    question: "What happens after I get replies?",
    answer:
      "Mark the thread as resolved once you've made a decision or gotten what you needed. That helps future members see what worked and keeps the room from feeling like an endless scroll. Resolved threads show up in recent outcomes so others can learn from them.",
  },
  {
    question: "Do you sell my data?",
    answer:
      "No. Never. Trust50 makes money from the 20% cut of paid rooms. That's it.",
  },
  {
    question: "How does pruning work?",
    answer:
      "Curators remove inactive members to keep rooms from going quiet. If you're not replying to threads or contributing context, you might get pruned. You'll usually get a warning first. If you don't re-engage, the curator removes you to free up a slot for someone on the waiting list. Pruning isn't personal. It's how quality stays legible.",
  },
  {
    question: "How much time does this take?",
    answer:
      "Expect to spend 15 to 30 minutes per room per week: reading active threads, replying to one or two questions where you have context, and asking your own questions when you need help. If you're not willing to contribute, don't join. Lurkers get pruned.",
  },
  {
    question: "Why would I pay for a room?",
    answer:
      "You pay when the room is valuable enough that you'd rather be in it than a free alternative. Free rooms are fine for exploration, reputation-building, or casual peer support. Paid rooms, roughly €30 to €300 per month, tend to have higher reply quality, faster resolution, better curation, and more selective membership. If you're getting €1,000 or more per month from better hires, introductions, or decisions, paying €100 to €200 is cheap.",
  },
  {
    question: "What if I join a room and it's not right for me?",
    answer:
      "Leave. You're not locked in. Free up that slot and join a different room.",
  },
  {
    question: "What if I need help outside my 4 rooms?",
    answer:
      "Ask in one of your rooms. Someone there is likely in another room where your answer lives. They can make an introduction or ask on your behalf. That's the 4 hops promise: the people in your rooms sit in other rooms too, and within two or three warm introductions you can usually reach the person you need.",
  },
  {
    question: "How do I start a room?",
    answer:
      "Click 'Start a group', set your room name, description, and price, anywhere from free to €300 per month, invite 5 to 10 people from your network to cold-start it, and once you hit 10 or more members, open up the waiting list. New members request access and existing members vote them in.",
  },
  {
    question: "How many rooms can I run?",
    answer:
      "4 rooms maximum. If you can't maintain quality across 4 rooms, you shouldn't run more.",
  },
  {
    question: "How much can I make?",
    answer:
      "You keep 80%. The platform keeps 20%. Example math: 1 room × 25 members × €50 per month = €1,000 gross -> €800 to you. 2 rooms × 30 members × €50 per month = €3,000 gross -> €2,400 to you. 3 rooms × 40 members × €75 per month = €9,000 gross -> €7,200 to you. Fill 2 to 3 paid rooms and Trust50 can replace a salary.",
  },
  {
    question: "Can I run both free and paid rooms?",
    answer:
      "Yes. Most successful paid rooms started free. A common pattern is launching a free room to build reputation, then after 3 to 6 months either converting it to paid or keeping it free and launching a paid premium tier for top contributors. Roughly 80% of rooms stay free, and that's by design.",
  },
  {
    question: "What if my room isn't growing?",
    answer:
      "Usually one of four things is true: your topic isn't compelling, your curation isn't strong enough, your price is too high, or your network isn't big enough to cold-start. If you can't fill to 15 or more members in 3 months, the room probably isn't viable. Shut it down and try something else.",
  },
  {
    question: "Can I raise my price mid-stream?",
    answer:
      "Yes. If your waiting list is 20 or more people, that's a signal you're underpriced. Raise it. Some members will churn, and you backfill from the waitlist.",
  },
  {
    question: "What if someone starts a competing room?",
    answer:
      "Good. Competition keeps quality high. If they run a better room, members will leave yours and join theirs. That's the model working. Your job is to prove your room is worth staying in.",
  },
  {
    question: "What if I want to stop curating?",
    answer:
      "Step down. Members can vote in a new curator from the existing membership, or the room dissolves. Revenue follows stewardship: whoever does the work earns the 80%.",
  },
  {
    question: "What happens if members vote me out?",
    answer:
      "If members trigger a vote of no confidence and you lose, the room elects a replacement curator. You stop earning revenue. The room continues. This is rare, but it's the governance mechanism that keeps curators accountable.",
  },
  {
    question: "How does pruning work for curators?",
    answer:
      "You decide who to prune. Look for members who haven't replied to a thread in 30 or more days, members who joined but never engaged, or members whose replies are low-quality or off-topic. Message them privately first. If they don't re-engage, remove them and free up the slot for someone on the waiting list. Pruning isn't mean. It's curation.",
  },
  {
    question: "What does the platform do for its 20%?",
    answer:
      "Payments: Stripe integration, monthly billing, and auto-split 80/20. Governance: neutral third party handles voting, revenue escrow, and curator transitions. Infrastructure: waiting lists, quality signals, and room continuity. Subsidy: free rooms, roughly 80% of the network, pay nothing, so the 20% from paid rooms funds the infrastructure for everyone.",
  },
  {
    question: "Can curators censor discussions?",
    answer:
      "Curators can prune members and remove threads, but if they overreach, members can trigger a vote of no confidence and replace them. That's the balance: curators need authority to keep quality high, but members can remove curators who abuse that authority.",
  },
  {
    question: "What if a curator takes the money and ghosts?",
    answer:
      "Members can trigger a vote of no confidence. If the vote passes, the room elects a new curator and revenue shifts to them. The platform holds escrow during curator transitions so the room doesn't collapse.",
  },
  {
    question: "How do votes of no confidence work?",
    answer:
      "When 20% of members sign a petition, a vote is triggered. All members vote yes or no on replacing the curator. If more than 50% vote yes, the curator is removed and the room elects a replacement. This is rare. Most curators step down voluntarily before it gets to a vote.",
  },
  {
    question: "What happens to my data if I leave?",
    answer:
      "Your profile and past replies stay in the room so discussions remain coherent, but you lose access and stop appearing in the member list. If you want your data fully deleted, contact support.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq-section" className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">FAQ</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          The practical questions people ask before they join the right room.
        </p>
      </div>

      <div className="mt-6 divide-y divide-stone-200/80">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={faq.question} className="py-4">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="text-base font-medium text-foreground">{faq.question}</span>
                <span className="text-sm text-muted">{isOpen ? "-" : "+"}</span>
              </button>
              {isOpen ? <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{faq.answer}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
