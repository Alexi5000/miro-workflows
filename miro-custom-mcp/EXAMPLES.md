# Custom Miro MCP Examples & Templates

This guide shows you how to use the custom Miro MCP server to create professional, precisely-styled Miro boards.

## Basic Examples

### Create a Sticky Note
```
Create a yellow sticky note at position (0, 0) with the text "Start Here"
```

With custom color:
```
Create a pink sticky note at (200, 0) with the text "Important!" and width 250
```

### Create Shapes
```
Create a blue rectangle at position (100, 100) with width 300, height 200, containing "API Layer"
```

```
Create a green circle at (500, 100) with width 150, height 150, containing "DB"
```

### Create Frames (Organization)
```
Create a frame titled "Backend Architecture" at (0, 0) with width 1000 and height 600 with fill color #f0f0f0
```

### Create Text
```
Create text "Cost Analysis Dashboard" at (0, -200) with font size 36 and color #000000
```

### Create Cards
```
Create a card at (0, 300) with title "User Authentication" and description "Implement OAuth 2.0 flow" with color #fff9b1
```

## Advanced Templates

### Template 1: SWOT Analysis Board

```
Step 1: Create the main frame
Create a frame titled "SWOT Analysis - Q1 2026" at (0, 0) with width 1200 and height 800 with fill color #ffffff

Step 2: Create quadrant frames
Create a frame titled "Strengths" at (-300, -200) with width 550 and height 350 with fill color #d5f692

Create a frame titled "Weaknesses" at (300, -200) with width 550 and height 350 with fill color #ff9d9d

Create a frame titled "Opportunities" at (-300, 200) with width 550 and height 350 with fill color #ffd48f

Create a frame titled "Threats" at (300, 200) with width 550 and height 350 with fill color #f5d1ff

Step 3: Add sample items
Create a sticky note in the Strengths quadrant at (-300, -250) with text "Strong brand recognition" and color light_green

Create a sticky note in the Weaknesses quadrant at (300, -250) with text "Limited market presence in Asia" and color red

Create a sticky note in the Opportunities quadrant at (-300, 150) with text "Growing demand for AI solutions" and color orange

Create a sticky note in the Threats quadrant at (300, 150) with text "Increased competition" and color violet
```

### Template 2: System Architecture Diagram

```
Step 1: Create the title
Create text "System Architecture - Production" at (0, -400) with font size 48 and color #1a1a1a

Step 2: Create frontend layer
Create a blue rectangle at (-400, -200) with width 200 and height 100 containing "React Frontend" with fill color #9cd7fc and border color #1a1a1a

Step 3: Create API layer
Create a green rectangle at (0, -200) with width 200 and height 100 containing "FastAPI" with fill color #d5f692 and border color #1a1a1a

Step 4: Create database layer
Create a gray rectangle at (400, -200) with width 200 and height 100 containing "PostgreSQL" with fill color #e6e6e6 and border color #1a1a1a

Step 5: Create cache layer
Create an orange rectangle at (0, 0) with width 200 and height 100 containing "Redis Cache" with fill color #ffd48f and border color #1a1a1a

Step 6: Retrieve item IDs to create connectors
Get board items from board uXjVGQ5NtKU= with type "shape" and limit 10

Step 7: Connect the components (use actual item IDs from step 6)
Create a connector from [frontend_item_id] to [api_item_id] with shape "elbowed" and caption "HTTPS"

Create a connector from [api_item_id] to [database_item_id] with shape "elbowed" and caption "SQL"

Create a connector from [api_item_id] to [cache_item_id] with shape "elbowed" and caption "Cache queries"
```

### Template 3: Sprint Planning Board

```
Step 1: Create the main frame
Create a frame titled "Sprint 24 - Jan 15-29, 2026" at (0, 0) with width 1600 and height 1000 with fill color #fafafa

Step 2: Create status columns
Create a frame titled "Backlog" at (-600, 0) with width 350 and height 800 with fill color #ffffff

Create a frame titled "In Progress" at (-200, 0) with width 350 and height 800 with fill color #fff9b1

Create a frame titled "Review" at (200, 0) with width 350 and height 800 with fill color #ffd48f

Create a frame titled "Done" at (600, 0) with width 350 and height 800 with fill color #d5f692

Step 3: Add sample cards
Create a card at (-600, -200) with title "API Cost Tracking" and description "Implement real-time cost dashboard" with color #9cd7fc

Create a card at (-200, -200) with title "Database Migration" and description "Migrate to PostgreSQL 16" with color #f5d1ff

Create a card at (200, -200) with title "User Auth" and description "Add OAuth 2.0 support" with color #ffd48f

Create a card at (600, -200) with title "Documentation" and description "Update API docs" with color #d5f692
```

### Template 4: Cost Analysis Dashboard

```
Step 1: Create title section
Create text "Daily Cost Analysis - Jan 14, 2026" at (0, -450) with font size 42 and color #000000 and text align center

Step 2: Create metric frames
Create a frame titled "Total Spend" at (-400, -250) with width 250 and height 150 with fill color #fff9b1

Create a frame titled "Success Rate" at (0, -250) with width 250 and height 150 with fill color #d5f692

Create a frame titled "Waste" at (400, -250) with width 250 and height 150 with fill color #ff9d9d

Step 3: Add metrics (big numbers)
Create text "$115.76" at (-400, -250) with font size 48 and color #000000 and text align center

Create text "45.1%" at (0, -250) with font size 48 and color #000000 and text align center

Create text "$50.73" at (400, -250) with font size 48 and color #ff0000 and text align center

Step 4: Create provider comparison section
Create a frame titled "Provider Performance" at (0, 50) with width 900 and height 400 with fill color #f0f0f0

Step 5: Add provider cards
Create a sticky note at (-300, 0) with text "Gemini: $70.74 (49.6% success)" and color yellow

Create a sticky note at (0, 0) with text "Grok: $15.60 (87.5% success)" and color green

Create a sticky note at (300, 0) with text "Seedream: $8.26 (28.7% success)" and color red
```

## Color Palette Reference

### Sticky Note Colors
- `yellow` - #fff9b1 (default)
- `green` - #d5f692 (success)
- `blue` - #9cd7fc (info)
- `pink` - #f5d1ff (creative)
- `orange` - #ffd48f (warning)
- `red` - #ff9d9d (critical)
- `gray` - #e6e6e6 (neutral)
- `light_green` - #d0f0fd (calm)
- `violet` - #d5d5f7 (premium)
- `light_yellow` - #fffaa8 (highlight)

### Custom Hex Colors
You can use ANY hex color for shapes, frames, and text:
- Brand colors: `#FF6B35`, `#004E89`, `#F77F00`
- Gradients: Use multiple shapes with transparency
- Professional: `#2C3E50`, `#34495E`, `#7F8C8D`

## Shape Types Available

- `rectangle` - Standard box
- `round_rectangle` - Rounded corners
- `circle` - Perfect circle
- `triangle` - Three-sided shape
- `rhombus` - Diamond shape
- `parallelogram` - Slanted rectangle
- `trapezoid` - Trapezoidal shape
- `pentagon` - Five-sided shape
- `hexagon` - Six-sided shape
- `octagon` - Eight-sided shape
- `star` - Star shape
- `right_arrow` - Arrow pointing right
- `left_arrow` - Arrow pointing left

## Positioning Guide

The Miro board uses a coordinate system:
- `(0, 0)` = Center of the board
- Negative X = Left
- Positive X = Right
- Negative Y = Up
- Positive Y = Down

### Layout Grid Suggestions
- Small spacing: 150-200 pixels apart
- Medium spacing: 300-400 pixels apart
- Large spacing: 500-600 pixels apart

## Pro Tips

1. **Start with a frame** to define your workspace
2. **Use consistent spacing** (e.g., 300px between items)
3. **Color code** by category or status
4. **Get item IDs** before creating connectors
5. **Layer items** by creating frames first, then items inside
6. **Use text for titles** (bigger font) before adding content

## Need Help?

- See `.cursor/README_MCP_SETUP.md` for configuration help
- Run `bun run scripts/get_miro_token.ts` for token setup
- Check Miro API docs: https://developers.miro.com/reference/api-reference
