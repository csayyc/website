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
rsvp_label: ""      # optional button text, defaults to "RSVP" (e.g. "Register free")

# Optional — hero display
image: ""           # /images/events/filename.jpg — gradient shown when absent
time: ""            # e.g. "6:00 – 9:00 PM MDT"
venue: ""           # venue name, e.g. "Telus Sky Tower"
venue_address: ""   # full address, e.g. "700 9 Ave SW, Calgary, AB"
capacity:           # integer, e.g. 60 — omit entirely to hide capacity row
event_type: ""      # tag on hero, e.g. "Meetup", "Workshop", "Summit"

# Optional — partner or virtual events
# online: true                 # marks the event as virtual in structured data
# end_date: ""                 # for multi-day events
# organizer_name: ""           # when hosted by someone other than the chapter
# organizer_url: ""

# Optional — agenda (omit entire block to hide the section)
# agenda:
#   - time: "6:00 PM"
#     topic: "Doors Open"
#     desc: "Optional description."
---

Describe the event topic, audience, speakers, and key takeaways.
