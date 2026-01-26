# Lead Sharing Visibility - Visual Guide

## What You'll See

### Table View (Compact Indicator)

When viewing leads in table format, you'll see a small cyan badge in the Actions column:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Name          │ Phone        │ Provider │ Town    │ Status │ Actions    │
├─────────────────────────────────────────────────────────────────────────┤
│ ABC Company   │ 555-1234     │ Vodafone │ London  │ Leads  │ [👥 2] ... │
│ XYZ Business  │ 555-5678     │ BT       │ Leeds   │ Working│ [👥 1] ... │
│ Solo Lead     │ 555-9999     │ Sky      │ York    │ New    │ ...        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Hover over the badge** to see who has access:

```
                                    ┌─────────────────┐
                                    │ Shared with:    │
                                    │ • John Smith    │
                                    │ • Jane Doe      │
                                    └─────────────────┘
                                           ↑
                                      [👥 2] ← Hover here
```

### Card View (Expanded Indicator)

When viewing leads in card format, you'll see a full sharing panel at the top of each card:

```
┌──────────────────────────────────────────────────┐
│  Leads                                           │
│  ABC Company                                     │
│  IT Services                                     │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 👥 Shared with:                            │ │
│  │ • John Smith                               │ │
│  │ • Jane Doe                                 │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  📞 555-1234                                     │
│  📍 London                                       │
│  📧 contact@abc.com                              │
└──────────────────────────────────────────────────┘
```

## Different Views Based on Your Role

### If You're the Owner (You Shared the Lead)

**You see**: List of people you shared with

```
┌────────────────────────────────────┐
│ 👥 Shared with:                    │
│ • John Smith                       │
│ • Jane Doe                         │
│ • Bob Johnson                      │
└────────────────────────────────────┘
```

### If You're a Sharee (Lead Was Shared With You)

**You see**: The owner + other people who have access

```
┌────────────────────────────────────┐
│ 👥 Shared access:                  │
│ • Alice Manager (Owner)            │
│ • John Smith                       │
│ • Jane Doe                         │
└────────────────────────────────────┘
```

## When You'll See the Indicator

✅ **You WILL see it when:**
- You own a lead and have shared it with others
- A lead has been shared with you
- You're viewing any lead that has been shared

❌ **You WON'T see it when:**
- The lead hasn't been shared with anyone
- You're the only person with access to the lead

## Color Coding

The sharing indicator uses **cyan** colors to match the Share button:
- 🔵 Cyan badge/panel = Shared lead
- 🔵 Cyan Share button = Click to share with more users

## Quick Actions

### From Table View:
1. **Hover** over the badge to see who has access
2. **Click** the Share button (🔗) to share with more users

### From Card View:
1. **View** the full list of users with access
2. **Click** the Share button (🔗) to share with more users

## Example Scenarios

### Scenario 1: You Share a Lead
1. You click Share button on "ABC Company"
2. You select John and Jane from the user list
3. You click "Share Lead"
4. ✅ You now see **[👥 2]** badge or "Shared with: John, Jane"

### Scenario 2: Someone Shares a Lead With You
1. Alice shares "XYZ Business" with you
2. You navigate to Leads page
3. ✅ You see **[👥 2]** badge or "Shared access: Alice (Owner), John"
4. You know Alice owns it and John also has access

### Scenario 3: Re-sharing
1. Alice shares "ABC Company" with you
2. You see the sharing indicator
3. You click Share button to share with Bob
4. ✅ Now everyone sees **[👥 3]** (Alice, You, Bob)

## Tips

💡 **Quick Identification**: Scan for cyan badges to quickly find shared leads

💡 **Collaboration**: See who else is working on the same lead

💡 **Transparency**: Always know who has access to your leads

💡 **Re-sharing**: You can share leads that were shared with you

## Troubleshooting

**Q: I don't see the indicator**
- A: The lead hasn't been shared yet. Click the Share button to share it.

**Q: The indicator shows wrong information**
- A: Refresh the page. The indicator fetches live data from the server.

**Q: I can't see who shared it with me**
- A: The owner is marked as "(Owner)" in the list. That's who shared it.

**Q: Can I remove someone's access?**
- A: Currently, use the Share button to manage sharing. Removal feature coming soon.

## What's Next?

After sharing is working perfectly, you can:
1. View all your shared leads
2. Collaborate with team members
3. Track who's working on what
4. Re-share leads as needed
5. Maintain visibility across your team
