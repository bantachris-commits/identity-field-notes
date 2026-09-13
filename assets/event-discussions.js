(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const dt = s => new Date(s).toLocaleString("en-US", {month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit"});
  const text = s => esc(s).replace(/\n/g, "<br>");
  const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "event";
  const eventId = e => e.id || `${e.date || "event"}-${slug(e.name)}`;
  const flair = p => p?.flair ? `<span class="ifn-flair">${esc(p.flair)}</span>` : "";

  async function setup() {
    const cards = [...document.querySelectorAll("#eventsList > .card")];
    if (!cards.length || !window.IFNCommunityAuth || !window.IFNCommunityData) return;
    const events = await fetch("data/events.json", {cache:"no-store"}).then(r => r.json());
    const user = await IFNCommunityAuth.getUser();

    for (let i = 0; i < cards.length && i < events.length; i++) {
      const card = cards[i], event = events[i], id = eventId(event), threadId = `event::${id}`;
      card.id = id;
      card.classList.add("event-card");
      card.dataset.eventId = id;
      if (card.querySelector("[data-event-discussion]")) continue;

      const panel = document.createElement("details");
      panel.className = "story-discussion event-discussion";
      panel.dataset.eventDiscussion = "true";
      panel.innerHTML = '<summary><span>Attendee discussion</span><span class="story-discussion-count" data-count>Loading…</span></summary><div class="story-discussion-body"><p class="fine event-discussion-intro">Going, speaking, looking for people to meet, or know a session worth catching? Use this thread for the conference itself.</p><div class="story-discussion-compose"></div><div class="story-discussion-thread"><p class="fine">Loading discussion…</p></div></div>';
      card.appendChild(panel);

      const compose = panel.querySelector(".story-discussion-compose");
      if (user) {
        compose.innerHTML = '<form class="ifn-compose"><textarea name="body" rows="3" maxlength="8000" required placeholder="Going to this event? Share plans, sessions, meetups, questions, or useful field notes…"></textarea><button class="btn small" type="submit">Add to discussion</button><span class="fine" data-status></span></form>';
        compose.querySelector("form").addEventListener("submit", async ev => {
          ev.preventDefault();
          const form = ev.currentTarget, status = form.querySelector("[data-status]");
          try {
            status.textContent = "Posting…";
            await IFNCommunityData.create(threadId, {body:new FormData(form).get("body"), kind:"comment"});
            form.reset();
            status.textContent = "Posted.";
            await draw(panel, threadId, user);
          } catch (err) { status.textContent = err.message; }
        });
      } else {
        compose.innerHTML = '<div class="story-discussion-signin"><p class="fine">Reading is public. Sign in to join the attendee discussion.</p><button class="btn small alt" type="button" data-event-signin>Sign in to comment</button><div data-event-auth></div></div>';
        compose.querySelector("[data-event-signin]").addEventListener("click", async ev => {
          ev.currentTarget.remove();
          await IFNCommunityAuth.renderAuth(compose.querySelector("[data-event-auth]"));
        });
      }
      await draw(panel, threadId, user);
    }

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target?.classList.contains("event-card")) {
        const panel = target.querySelector("[data-event-discussion]");
        if (panel) panel.open = true;
        setTimeout(() => target.scrollIntoView({block:"start"}), 100);
      }
    }
  }

  async function draw(panel, threadId, user) {
    const out = panel.querySelector(".story-discussion-thread"), count = panel.querySelector("[data-count]");
    try {
      const {comments, profiles} = await IFNCommunityData.thread(threadId);
      count.textContent = comments.length ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Start discussion";
      const roots = comments.filter(c => !c.parent_id), replies = comments.filter(c => c.parent_id);
      if (!roots.length) {
        out.innerHTML = '<div class="story-discussion-empty">No attendee notes yet. You can be first.</div>';
        return;
      }
      out.innerHTML = roots.map(c => {
        const p = profiles.get(c.user_id) || {}, kids = replies.filter(r => r.parent_id === c.id);
        return `<article class="ifn-comment"><div class="ifn-comment-head"><div><strong>${esc(p.display_name || "Identity practitioner")}</strong> ${flair(p)}</div><span class="fine">${dt(c.created_at)}</span></div>${p.headline ? `<div class="fine">${esc(p.headline)}</div>` : ""}<div class="ifn-comment-body">${text(c.body)}</div>${user ? `<button class="ifn-reply-toggle" type="button" data-reply-toggle="${c.id}">Reply</button><form class="ifn-reply-form" data-reply-form="${c.id}" hidden><textarea name="body" rows="3" maxlength="8000" required placeholder="Reply…"></textarea><button class="btn small" type="submit">Post reply</button><span class="fine" data-status></span></form>` : ""}${kids.length ? `<div class="ifn-replies">${kids.map(r => { const rp = profiles.get(r.user_id) || {}; return `<div class="ifn-reply"><div class="ifn-comment-head"><div><strong>${esc(rp.display_name || "Identity practitioner")}</strong> ${flair(rp)}</div><span class="fine">${dt(r.created_at)}</span></div><div class="ifn-comment-body">${text(r.body)}</div></div>`; }).join("")}</div>` : ""}</article>`;
      }).join("");

      out.querySelectorAll("[data-reply-toggle]").forEach(button => button.addEventListener("click", () => {
        const form = out.querySelector(`[data-reply-form="${button.dataset.replyToggle}"]`);
        if (form) form.hidden = !form.hidden;
      }));
      out.querySelectorAll("[data-reply-form]").forEach(form => form.addEventListener("submit", async ev => {
        ev.preventDefault();
        const current = ev.currentTarget, status = current.querySelector("[data-status]");
        try {
          status.textContent = "Posting…";
          await IFNCommunityData.create(threadId, {body:new FormData(current).get("body"), parentId:current.dataset.replyForm, kind:"reply"});
          current.reset();
          await draw(panel, threadId, user);
        } catch (err) { status.textContent = err.message; }
      }));
    } catch (err) {
      count.textContent = "Discussion unavailable";
      out.innerHTML = `<div class="story-discussion-empty">${esc(err.message)}</div>`;
    }
  }

  window.IFNEventDiscussions = {setup};
})();
