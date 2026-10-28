from django.db import models


class Conversation(models.Model):
    """One thread. "Reset conversation" ends it and starts a new one; orders and notes stay."""

    person = models.ForeignKey('accounts.Person', on_delete=models.CASCADE, related_name='conversations')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    # One turn at a time per thread; a turn that dies releases this when it expires.
    busy_until = models.DateTimeField(null=True, blank=True)


class Message(models.Model):
    """
    One entry in the timeline: what the person said, what Hunch said and did (ack, steps, words, cards),
    or something that happened in the app (role "event": added to cart, paid, set up).
    """

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10)  # user | hunch | event
    kind = models.CharField(max_length=20, blank=True)  # for events: cart, paid, payment_failed, cancelled, setup
    text = models.TextField(blank=True)
    ack = models.TextField(blank=True)
    steps = models.JSONField(default=list)
    components = models.JSONField(default=list)
    # The browser's id for the turn this message started, so a retried send never runs twice.
    turn_id = models.CharField(max_length=40, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class AgentRun(models.Model):
    """One turn of the agent, for debugging and cost: which tools, how many tokens, how long."""

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='runs')
    model = models.CharField(max_length=40)
    rounds = models.PositiveSmallIntegerField(default=0)
    tools = models.JSONField(default=list)
    input_tokens = models.PositiveIntegerField(default=0)
    cached_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    ms = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
