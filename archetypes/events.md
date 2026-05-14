---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: "{{ .Date }}"
draft: true

# Required
description: ""
location: "Calgary, AB"

# RSVP / social links (either or both; leave blank for "coming soon" state)
meetup_url: ""
linkedin_url: ""

# Optional — hero display
image: ""           # /images/events/filename.jpg — gradient shown when absent
time: ""            # e.g. "6:00 – 9:00 PM MDT"
venue: ""           # venue name, e.g. "Telus Sky Tower"
venue_address: ""   # full address, e.g. "700 9 Ave SW, Calgary, AB"
capacity:           # integer, e.g. 60 — omit entirely to hide capacity row
event_type: ""      # tag on hero, e.g. "Meetup", "Workshop", "Summit"

# Optional — agenda (omit entire block to hide the section)
# agenda:
#   - time: "6:00 PM"
#     topic: "Doors Open"
#     desc: "Optional description."
---

Describe the event topic, audience, speakers, and key takeaways.
