---
title: 'So I Built This AI Thing That Doesnt Suck'
tags:
  - ai
  - personal-project
  - nextjs
created: 2026-06-14
status: published
---

[⬅️ Back to Blogs](README.md)

So I've been working on this project called "Everyday AI" for a while now, and I thought it might be interesting to share what it's all about. It's basically a collection of AI tools that are supposed to make regular daily tasks a bit easier. You know, like writing emails, planning trips, and staying on top of the news.

## What Even Is This Thing?

The idea started pretty simple - I was tired of spending way too much time on things that should be quick. Like writing professional emails that don't sound like a robot wrote them, or trying to figure out what to do on vacation without reading a million travel blogs. So I thought, hey, what if we could get AI to help with this stuff?

Everyday AI is basically a web app with three main tools right now. There's a Smart Email Assistant that looks at your emails and gives you suggestions to make them sound better. Then there's a Travel Itinerary Builder that's supposed to help plan trips (though that one's still in the works). And finally, there's a News Digest tool that summarizes news articles so you don't have to read through everything.

![AI Tools](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bj0i6buecjmbbc2lyqso.png)

## The Tech Stuff (But Not Too Boring)

I built this using Next.js for the frontend, which is this React framework that's pretty popular these days. The backend is Python with Flask, which I chose because it's straightforward and doesn't overcomplicate things. For the AI part, I'm using both DeepSeek's API and Google's Gemini Flash, which are these newer AI models that are supposed to be pretty good at understanding context.

![AI Models - Cloud + Local](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/v4bbklc3p07v540urvkz.png)

The cool thing is that it works both ways - you can use the cloud version with either DeepSeek or Gemini APIs, or if you're into that kind of thing, you can run local models with Ollama. I added that option mainly because some people are really into privacy and want everything to run on their own computer.

## What Actually Works Right Now

The Smart Email Assistant is the one that's fully functional. You paste in an email you're writing, and it gives you feedback on things like tone, clarity, and grammar. It's not perfect, but it's surprisingly helpful. Like, it'll tell you if your email sounds too formal or too casual, and suggest ways to make it clearer.

![Smart Email](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/jl4icpc8mw8f8ckc6cft.png)

The interface is pretty clean - just a simple form where you type your email, and then you get this analysis back with suggestions. I tried to make it look nice with Tailwind CSS, which is this utility-first CSS framework that makes styling less of a nightmare.

## The Stuff That's Still Coming

The Travel Itinerary Builder is supposed to help you plan trips by suggesting destinations, activities, and even budget tips. I've got the basic structure set up, but it's not quite ready yet. The idea is that you tell it what kind of trip you want (adventure, relaxation, cultural, etc.), your budget, and how long you're going, and it gives you a personalized itinerary.

The News Digest tool is also in progress. The plan is to have the AI pull in the latest news and create summaries that are actually readable, not just regurgitated headlines. I'm letting the AI handle the news gathering, which should give more relevant and up-to-date information.

## Why I Built It This Way

I wanted to keep things simple. A lot of AI tools out there are either too complicated or try to do too much. This one is focused on specific, everyday tasks that people actually struggle with. The interface is clean and doesn't require a PhD to figure out how to use it.

I also wanted to make sure it works on different devices. The responsive design means it looks decent on phones, tablets, and computers. And I added dark mode support because, well, who doesn't like dark mode these days?

## The Challenges I Ran Into

Getting the AI responses to be actually useful was harder than I expected. Sometimes the AI would give really generic advice, or suggestions that didn't make sense in context. I had to spend a lot of time tweaking the prompts and figuring out how to structure the requests to get better results.

The local model setup was also a bit tricky. Ollama is great, but getting everything to work together smoothly took some trial and error. And making sure the app doesn't break when switching between cloud and local models required some careful planning.

## What I Learned

Building this project taught me a lot about how to structure AI applications. The key is making sure the AI has enough context to give useful suggestions, but not so much that it gets confused. I also learned that user experience is really important - even if the AI is working perfectly, if the interface is clunky, people won't use it.

Another thing I realized is that AI tools work best when they're focused on specific tasks rather than trying to be everything to everyone. The Smart Email Assistant works well because it has a clear, defined purpose.

## Where It's Going

I'm planning to add more tools as I go. An AI code reviewer would be really useful - imagine having an AI look at your code and give you suggestions for improvements, bug fixes, and best practices. That could be a game-changer for developers.

The goal is to keep expanding the toolkit while keeping everything simple and useful. I want to keep it as a standalone tool that doesn't require any account creation or collaboration features - just simple, focused tools that do one thing well.

## The Bottom Line

Everyday AI is basically my attempt to make AI actually useful for regular daily tasks. It's not perfect, and there's still a lot of work to do, but it's a start. The idea is to take the power of AI and apply it to problems that people actually face every day.

If you're interested in trying it out or want to see how it works, you can check out the [GitHub repository](https://github.com/vkondi/everyday-ai) or try the [live website](https://everyday-ai-tools.vercel.app/). It's open source, so if you have ideas for improvements or want to contribute, that would be awesome. The whole point is to make AI more accessible and useful for everyday life, not just for tech companies with huge budgets.

Anyway, that's the story of how I ended up building an AI assistant for daily tasks. It's been a fun project to work on, and hopefully it'll actually help people with their day-to-day stuff. We'll see how it goes!

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/So_I_Built_This_AI_Thing_That_Doesnt_Suck.md)
