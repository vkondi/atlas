[⬅️ Back to Career & Leadership](../README.md)

# Mentoring Engineers

An operational guide to engineering mentorship, constructing structured 30-60-90 day onboarding plans, executing constructive 1-on-1 meetings, and applying coaching techniques.

---

## Why It Matters

Mentorship is a primary mechanism for scaling engineering teams and developing technical talent. However, many organizations approach mentoring informally: senior engineers answer questions reactively, and new hires are onboarded without structured plans. This leads to slow onboarding times, inconsistent code quality, and low team morale.

Establishing a structured mentoring framework accelerates a developer's path to independent execution. By designing milestone-driven onboarding roadmaps, running regular 1-on-1s, and shifting from direct direction to active coaching, senior engineers can multiply team capabilities and build a high-performing engineering culture.

---

## Core Concepts

### 1. The 30-60-90 Day Onboarding Plan

Onboarding should follow a structured progression of milestones to prevent new hires from feeling overwhelmed:

- **Day 30 (Learn)**: Focuses on environment setup, understanding team processes, and shipping a simple bug fix.
- **Day 60 (Collaborate)**: Focuses on owning a medium-sized feature component, collaborating on code reviews, and contributing to design discussions.
- **Day 90 (Own)**: Focuses on owning a feature area independently, participating in on-call rotations, and proposing system improvements.

### 2. Socratic Coaching vs. Dictation

When a mentee encounters a blocker, avoid giving the solution immediately. Use Socratic coaching questions to guide them to the answer, helping them build debugging and problem-solving skills:

1. _What is the observed behavior, and what is the expected outcome?_
1. _What diagnostic steps have you taken so far?_
1. _If you look at the error logs, what components do you suspect are involved?_
1. _What are the trade-offs of the options you are considering?_

### 3. Structured 1-on-1 Frameworks

1-on-1 meetings should be dedicated to career growth, feedback, and blocker resolution, not project status updates. Structure the discussion around:

- **Pulse Check**: How is the mentee feeling? Check on workload and team dynamics.
- **Growth Goals**: Review progress against their career growth plans.
- **Feedback Loop**: Provide constructive feedback and request feedback on your mentorship style.

---

## Real-World Production Learnings

We operated a platform engineering group where junior hires struggled to ramp up, taking an average of six months to deliver their first major feature.

**The Failure**:
New hires spent their first two weeks request access rights, reading outdated wikis, and trying to run the primary codebase. Lacking a structured onboarding plan, they felt isolated, made few commits, and experienced low morale. Senior engineers spent hours answering repetitive questions, interrupting their own work.

**The Diagnostic**:

1. **Unstructured Onboarding**: The lack of onboarding check-lists left new hires confused about targets and expectations.
2. **Dictatorial Mentorship**: Senior developers pointed out syntax fixes immediately instead of teaching debugging workflows.
3. **No Dedicated Mentors**: New hires did not have a dedicated peer to guide them daily, slowing down integration.

**The Refactor**:
We assigned a dedicated onboarding buddy to every new hire, deployed a standardized 30-60-90 day onboarding roadmap, and trained senior staff on Socratic coaching patterns:

1. **Assigned Mentors**: Assigned a peer buddy to pair with the new hire daily.
2. **Standardized Onboarding Goals**: Deployed a milestone-driven onboarding template.
3. **Coaching Workshops**: Trained senior engineers to guide problem-solving rather than dictate solutions.

Here is the onboarding roadmap template we checked into our guides folder:

```markdown
# Developer Onboarding Roadmap: 30-60-90 Day Plan

## Day 30: Integration & First Commit

- **Objective**: Establish dev environment and understand workflow pipelines.
- **Milestones**:
  - Set up local environment and pass test validation suites.
  - Complete the core repository architecture walkthrough.
  - Ship a bug fix to production under mentor guidance.
- **Review**: Day 30 sync with buddy and manager.

## Day 60: Collaborative Delivery

- **Objective**: Own a feature component and participate in team reviews.
- **Milestones**:
  - Design and implement a medium-severity API endpoint.
  - Conduct code reviews using Conventional Comments.
  - Participate in team sprint planning and standups.
- **Review**: Day 60 feedback calibration.

## Day 90: Domain Ownership

- **Objective**: Own a service area independently and join rotations.
- **Milestones**:
  - Own a feature cycle from design document to deployment.
  - Join the secondary on-call rotation.
  - Lead a team system design sync.
- **Review**: Final onboarding assessment.
```

By establishing this framework:

- Junior engineers reached independent feature delivery in **two months** instead of six.
- Senior engineers saved **4 hours per week** because new hires used structured resources and resolved blockers independently.
- Team satisfaction and retention scores improved significantly due to the supportive onboarding environment.

---

## Related Reading

- [Career Development Basics](../career-development/basics.md)
- [Engineering Career Growth Paths](../career-development/career-growth-path.md)
- [Engineering Leadership Basics](./basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.leadership-skills.mentoring-engineers.md)
