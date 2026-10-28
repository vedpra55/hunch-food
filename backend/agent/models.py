from django.db import models


class Conversation(models.Model):
    """One thread. "Reset conversation" ends it and starts a new one; orders and memories stay."""

    person = models.ForeignKey('accounts.Person', on_delete=models.CASCADE, related_name='conversations')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    # The model keeps the transcript (Responses API, store=True); we chain turns by response id.
    last_response_id = models.CharField(max_length=80, blank=True)
    # Tool outputs owed to the model when a turn ended on a display tool; sent first next turn.
    pending = models.JSONField(default=list)
    turns = models.PositiveIntegerField(default=0)


class Message(models.Model):
    """What the person saw: their words, Hunch's words, the steps it took and the components it showed."""

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10)  # user | hunch
    text = models.TextField(blank=True)
    ack = models.TextField(blank=True)
    steps = models.JSONField(default=list)
    components = models.JSONField(default=list)
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
    output_tokens = models.PositiveIntegerField(default=0)
    ms = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
