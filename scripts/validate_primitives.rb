#!/usr/bin/env ruby
# frozen_string_literal: true

require "yaml"
require "uri"

VALID_TYPES = %w[recipe strategy workflow].freeze
VALID_VISIBILITY = %w[public unlisted private].freeze
SEMVER_PATTERN = /\A\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\z/
SLUG_PATTERN = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/
CREATE_PAGE_WORKFLOW_TRIGGER_PATTERNS = [
  /-\s*Trigger:\s*Recurring schedule\s*`([^`]+)`\s*\(([^)]+)\)/i,
  /-\s*Trigger:\s*recurring schedule\s*`([^`]+)`\s*in\s*`([^`]+)`/i,
  /-\s*Trigger:\s*Recurring schedule\s*`([^`]+)`\s*in\s*`([^`]+)`/i,
  /-\s*Schedule(?: the workflow)?(?: for| at)?\s*`([^`]+)`\s*in\s*`([^`]+)`/i,
  /-\s*Live schedule target:\s*`([^`]+)`\s*\(([^)]+)\)/i
].freeze
CRON_FIELD_PATTERN = /\A\S+(?:\s+\S+){4,}\z/
CREATE_PAGE_TIMEZONE_PATTERN = /\A(?:UTC|GMT|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)\z/i
CREATE_PAGE_SCHEDULE_EXAMPLE = '`- Trigger: recurring schedule `7 */2 * * *` in `Europe/London`.`'

Entry = Struct.new(:path, :data, :id, :type, keyword_init: true)

def array_of_strings?(value)
  value.is_a?(Array) && value.all? { |item| item.is_a?(String) && !item.strip.empty? }
end

def primitive_files
  (Dir["recipes/**/*.md"] + Dir["strategies/**/*.md"] + Dir["workflows/*/README.md"]).sort
end

def parse_frontmatter(path)
  content = File.read(path)
  lines = content.lines
  return [nil, "#{path}: missing frontmatter start delimiter"] unless lines.first&.strip == "---"

  closing_idx = lines[1..]&.index { |line| line.strip == "---" }
  return [nil, "#{path}: missing frontmatter end delimiter"] unless closing_idx

  yaml_text = lines[1..closing_idx].join
  data = YAML.safe_load(yaml_text, aliases: true)
  return [nil, "#{path}: frontmatter is not a YAML object"] unless data.is_a?(Hash)

  [data, nil]
rescue Psych::SyntaxError => e
  [nil, "#{path}: invalid YAML frontmatter (#{e.message})"]
end

def validate_url(url)
  return true if url.start_with?("/")

  uri = URI.parse(url)
  %w[http https].include?(uri.scheme) && !uri.host.to_s.empty?
rescue URI::InvalidURIError
  false
end

def create_page_workflow_schedule?(path)
  content = File.read(path)
  CREATE_PAGE_WORKFLOW_TRIGGER_PATTERNS.any? do |pattern|
    match = content.match(pattern)
    cron_expression = match&.[](1).to_s.strip
    timezone = match&.[](2).to_s.strip

    cron_expression.match?(CRON_FIELD_PATTERN) && timezone.match?(CREATE_PAGE_TIMEZONE_PATTERN)
  end
end

errors = []
entries = []

primitive_files.each do |path|
  data, parse_error = parse_frontmatter(path)
  if parse_error
    errors << parse_error
    next
  end

  id = data["id"]
  type = data["type"]

  if id.to_s.strip.empty?
    errors << "#{path}: missing required field `id`"
  elsif id !~ SLUG_PATTERN
    errors << "#{path}: `id` must be lowercase kebab-case"
  end

  if !VALID_TYPES.include?(type)
    errors << "#{path}: `type` must be one of #{VALID_TYPES.join(', ')}"
  end

  slug = data["slug"]
  if slug.to_s.strip.empty?
    errors << "#{path}: missing required field `slug`"
  elsif slug !~ SLUG_PATTERN
    errors << "#{path}: `slug` must be lowercase kebab-case"
  end

  version = data["version"]
  if version.to_s.strip.empty?
    errors << "#{path}: missing required field `version`"
  elsif version !~ SEMVER_PATTERN
    errors << "#{path}: `version` must be semver (for example 1.2.3)"
  end

  visibility = data["visibility"]
  if visibility.to_s.strip.empty?
    errors << "#{path}: missing required field `visibility`"
  elsif !VALID_VISIBILITY.include?(visibility)
    errors << "#{path}: `visibility` must be one of #{VALID_VISIBILITY.join(', ')}"
  end

  public_url = data["publicUrl"]
  if visibility == "public"
    if public_url.nil? || public_url.to_s.strip.empty?
      errors << "#{path}: `publicUrl` is required when `visibility` is public"
    elsif !validate_url(public_url)
      errors << "#{path}: `publicUrl` must be an absolute URL or app-relative path"
    end
  elsif !public_url.nil? && !public_url.to_s.strip.empty? && !validate_url(public_url)
    errors << "#{path}: `publicUrl` must be an absolute URL or app-relative path"
  end

  category = data["category"].to_s
  case type
  when "recipe"
    errors << "#{path}: `category` must start with `recipes/`" unless category.start_with?("recipes/")
  when "strategy"
    errors << "#{path}: `category` must start with `strategies/`" unless category.start_with?("strategies/")
  when "workflow"
    errors << "#{path}: `category` must start with `workflows/`" unless category.start_with?("workflows/")
  end

  relationships = data["relationships"]
  if relationships && !relationships.is_a?(Hash)
    errors << "#{path}: `relationships` must be a mapping object"
  end

  if type == "strategy"
    recipe_ids = relationships&.dig("recipeIds")
    if !array_of_strings?(recipe_ids) || recipe_ids.empty?
      errors << "#{path}: strategy must declare non-empty `relationships.recipeIds`"
    end

    workflow_ids = relationships&.dig("workflowIds")
    if workflow_ids && !array_of_strings?(workflow_ids)
      errors << "#{path}: `relationships.workflowIds` must be an array of string ids when present"
    end
  else
    strategy_ids = relationships&.dig("strategyIds")
    if strategy_ids && !array_of_strings?(strategy_ids)
      errors << "#{path}: `relationships.strategyIds` must be an array of string ids when present"
    end
  end

  entries << Entry.new(path: path, data: data, id: id, type: type)
end

id_index = {}
entries.each do |entry|
  next if entry.id.to_s.strip.empty?

  if id_index.key?(entry.id)
    errors << "duplicate id `#{entry.id}` in #{entry.path} and #{id_index[entry.id].path}"
  else
    id_index[entry.id] = entry
  end
end

entries.each do |entry|
  relationships = entry.data["relationships"] || {}

  if entry.type == "strategy"
    Array(relationships["recipeIds"]).each do |recipe_id|
      target = id_index[recipe_id]
      if target.nil?
        errors << "#{entry.path}: strategy references missing recipe id `#{recipe_id}`"
      elsif target.type != "recipe"
        errors << "#{entry.path}: `#{recipe_id}` exists but is not a recipe"
      end
    end

    Array(relationships["workflowIds"]).each do |workflow_id|
      target = id_index[workflow_id]
      if target.nil?
        errors << "#{entry.path}: strategy references missing workflow id `#{workflow_id}`"
      elsif target.type != "workflow"
        errors << "#{entry.path}: `#{workflow_id}` exists but is not a workflow"
      elsif !create_page_workflow_schedule?(target.path)
        errors << [
          "#{target.path}: strategy-linked workflow must declare a /create-compatible recurring schedule,",
          "for example #{CREATE_PAGE_SCHEDULE_EXAMPLE}"
        ].join(" ")
      end
    end
  else
    Array(relationships["strategyIds"]).each do |strategy_id|
      target = id_index[strategy_id]
      if target.nil?
        errors << "#{entry.path}: references missing strategy id `#{strategy_id}`"
      elsif target.type != "strategy"
        errors << "#{entry.path}: `#{strategy_id}` exists but is not a strategy"
      end
    end
  end
end

if errors.empty?
  puts "primitive metadata validation passed for #{entries.length} entries"
  exit 0
end

warn "primitive metadata validation failed:"
errors.each { |error| warn "- #{error}" }
exit 1
